// AuthContext workspace-only (Onda 8, macrofrente de identidade).
//
// ## O que este contexto é
//
//   provider autenticador temporário  →  token / sessão
//   GET /v1/me                        →  memberships permitidas
//   workspace atual                   →  escolhido DENTRO das memberships
//
// A autoridade de membership é o Gateway, que a projeta das claims do Keycloak. O frontend não
// consulta `workspaces` nem `workspace_members`: essas leituras eram o Supabase Database servindo
// de autoridade de autorização, que a matriz proíbe.
//
// ## O que saiu, e por quê
//
// `project` / `environment` (e todo o `systemRegistry`): nunca foram identidade. Eram o eixo de
// escopo do caminho de análise legado, que saiu junto com ele. Não voltam como claim do Keycloak
// — o Discovery provou que não são identidade, e transformá-los em claim mudaria o erro de lugar.
//
// `createWorkspace` / `renameWorkspace` / `deleteWorkspace`: eram escritas do navegador em tabelas
// do Supabase. Membership pertence ao Keycloak; não há — e não deve haver — endpoint `/v1` que
// deixe o cliente criar o próprio vínculo. A tela de workspaces passa a LISTAR o que a projeção
// autoriza. Provisionar workspace é ação administrativa, fora deste contexto.
//
// ## Preferência local não concede acesso
//
// O último workspace usado é guardado em `localStorage` como PREFERÊNCIA. Ela só vale se aparecer
// em `/v1/me`. Um id vindo de storage (ou de URL) que não esteja na projeção é descartado — não
// corrigido, não "tentado". Pedir um workspace nunca é prova de pertencer a ele.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAuthClient } from "@/lib/auth/index";
import { readE2EInjection } from "@/lib/auth/e2eBridge";
import type { AuthSession, AuthUser } from "@/lib/auth/index";
import { getV1Client } from "@/lib/v1/defaultClient";
import type { MeView, WorkspaceMembershipView } from "@/lib/v1";

const CHAVE_PREFERENCIA = "sentinela:workspace";

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  /** Resolvendo a SESSÃO (token). */
  loading: boolean;
  /** Resolvendo as MEMBERSHIPS (`/v1/me`). Separado: há sessão antes de haver projeção. */
  membershipsLoading: boolean;
  /** Falha ao projetar memberships. Estado explícito — nunca "sem workspaces" silencioso. */
  membershipsError: Error | null;
  memberships: WorkspaceMembershipView[];
  /**
   * O que o Gateway declara que ESTE ambiente oferece. `null` = ainda não projetado.
   *
   * `null` não é 'desligado'. Quem consome precisa distinguir as duas coisas, senão a
   * janela de carregamento vira uma negativa — e a jornada fecharia sozinha a cada
   * navegação, por um motivo que nunca aconteceu.
   */
  capabilities: MeView["capabilities"] | null;
  workspace: WorkspaceMembershipView | null;
  /** Troca para um workspace PERMITIDO. Id fora da projeção é rejeitado (retorna `false`). */
  switchWorkspace: (workspaceId: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Lê a preferência local. Ela sugere; a projeção decide. */
function preferenciaLocal(): string | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_PREFERENCIA);
    return bruto && bruto.trim() ? bruto.trim() : null;
  } catch {
    return null;
  }
}

function gravarPreferencia(workspaceId: string | null) {
  try {
    if (workspaceId) window.localStorage.setItem(CHAVE_PREFERENCIA, workspaceId);
    else window.localStorage.removeItem(CHAVE_PREFERENCIA);
  } catch {
    // Storage indisponível (modo privado, cota). Preferência é conveniência, não requisito.
  }
}

/**
 * Escolhe o workspace ativo DENTRO da projeção.
 *
 * Fail-closed por construção: a busca acontece na lista autorizada, então um id inventado nunca
 * vira `workspace`. Sem memberships, o resultado é `null` — não há acesso a conceder.
 */
export function escolherWorkspace(
  memberships: WorkspaceMembershipView[],
  preferido: string | null,
): WorkspaceMembershipView | null {
  if (memberships.length === 0) return null;
  const encontrado = preferido ? memberships.find((m) => m.id === preferido) : undefined;
  return encontrado ?? memberships[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [memberships, setMemberships] = useState<WorkspaceMembershipView[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [membershipsError, setMembershipsError] = useState<Error | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<MeView["capabilities"] | null>(null);

  // ── Sessão: fronteira autenticadora temporária ───────────────────────────────────────────────
  useEffect(() => {
    const authClient = getAuthClient();
    let vivo = true;

    const aplicar = (proxima: AuthSession | null) => {
      if (!vivo) return;
      setSession(proxima);
      setUser(proxima?.user ?? null);
      setLoading(false);
    };

    void authClient.getSession().then(aplicar);
    const unsubscribe = authClient.onAuthStateChange(aplicar);

    return () => {
      vivo = false;
      unsubscribe?.();
    };
  }, []);

  // ── Memberships: projeção do Gateway ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      // Sem usuário não há projeção — e não há workspace. Zerar é o estado correto, não um erro.
      setMemberships([]);
      setWorkspaceId(null);
      setCapabilities(null);
      setMembershipsError(null);
      setMembershipsLoading(false);
      return;
    }

    // CADEADO fail-closed: o bypass E2E só existe em DEV. Em produção `import.meta.env.DEV` é o
    // literal `false`, este ramo é eliminado do bundle, e `/v1/me` é o único caminho.
    if (import.meta.env.DEV) {
      const injetado = readE2EInjection();
      if (injetado) {
        const membership: WorkspaceMembershipView = {
          id: injetado.workspace.id,
          name: injetado.workspace.name,
          role: "owner",
        };
        setMemberships([membership]);
        setWorkspaceId(membership.id);
        setCapabilities({ canonical_analysis_enabled: true });
        setMembershipsError(null);
        setMembershipsLoading(false);
        return;
      }
    }

    // A projeção ANTERIOR cai aqui, antes de a nova chegar.
    //
    // Achado de review (Alta): `session`/`user` mudavam na hora, mas `memberships`/`workspaceId`
    // só eram substituídos quando `/v1/me` do novo usuário respondia. Na janela entre as duas
    // coisas o contexto afirmava `user = B` com `workspace = ws-a` — e um consumidor podia emitir
    // uma chamada com o token de B carregando o workspace de A.
    //
    // Zerar antes é fail-closed: durante a troca não há workspace, e não haver acesso é o estado
    // correto de quem ainda não foi projetado.
    setMemberships([]);
    setWorkspaceId(null);
    setCapabilities(null);
    setMembershipsLoading(true);
    setMembershipsError(null);
    let vivo = true;

    void getV1Client()
      .me()
      .then((me) => {
        if (!vivo) return;
        const lista = Array.isArray(me.workspaces) ? me.workspaces : [];
        setMemberships(lista);
        setCapabilities(me.capabilities ?? null);
        const ativo = escolherWorkspace(lista, preferenciaLocal());
        setWorkspaceId(ativo?.id ?? null);
        gravarPreferencia(ativo?.id ?? null);
      })
      .catch((erro: unknown) => {
        if (!vivo) return;
        // Falha de projeção NÃO vira "usuário sem workspaces": o estado é de erro, e a UI diz
        // isso. Ler indisponibilidade como afirmação sobre o usuário é fabricar resposta.
        setMembershipsError(erro instanceof Error ? erro : new Error(String(erro)));
        setMemberships([]);
        setWorkspaceId(null);
        setCapabilities(null);
      })
      .finally(() => {
        if (vivo) setMembershipsLoading(false);
      });

    return () => {
      vivo = false;
    };
  }, [user]);

  const workspace = useMemo(
    () => memberships.find((m) => m.id === workspaceId) ?? null,
    [memberships, workspaceId],
  );

  const switchWorkspace = useCallback(
    (alvo: string): boolean => {
      // A verificação é contra a PROJEÇÃO, não contra o pedido. Pedir não é pertencer.
      if (!memberships.some((m) => m.id === alvo)) return false;
      setWorkspaceId(alvo);
      gravarPreferencia(alvo);
      return true;
    },
    [memberships],
  );

  const signOut = useCallback(async () => {
    await getAuthClient().signOut();
    gravarPreferencia(null);
    setSession(null);
    setUser(null);
    setMemberships([]);
    setWorkspaceId(null);
    setCapabilities(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      membershipsLoading,
      membershipsError,
      memberships,
      capabilities,
      workspace,
      switchWorkspace,
      signOut,
    }),
    [
      user,
      session,
      loading,
      membershipsLoading,
      membershipsError,
      memberships,
      capabilities,
      workspace,
      switchWorkspace,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
