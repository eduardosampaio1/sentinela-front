import type { AuthClient, AuthSession } from "./types";

/** Forma estrutural mínima do User/UserManager do oidc-client-ts (injetável nos testes). */
interface OidcUserLike {
  access_token: string;
  expired?: boolean;
  profile: {
    sub: string;
    email?: string | null;
    name?: string | null;
    preferred_username?: string | null;
  };
}
interface UserManagerLike {
  getUser(): Promise<OidcUserLike | null>;
  /**
   * Renova a sessão pelo `refresh_token`, sem tirar a pessoa da tela.
   *
   * Estava fora desta interface, e a ausência tinha consequência: sem ela, `getAccessToken` não
   * tinha como pedir um token novo, e um token expirado virava `null` — que o cliente `/v1`
   * traduz em `authentication_required` SEM tocar a rede.
   */
  signinSilent(): Promise<OidcUserLike | null>;
  signinRedirect(args?: {
    state?: unknown;
    extraQueryParams?: Record<string, string>;
  }): Promise<void>;
  signinRedirectCallback(): Promise<OidcUserLike | null>;
  signoutRedirect(): Promise<void>;
  events: {
    addUserLoaded(cb: (u: OidcUserLike) => void): void;
    removeUserLoaded(cb: (u: OidcUserLike) => void): void;
    addUserUnloaded(cb: () => void): void;
    removeUserUnloaded(cb: () => void): void;
  };
}

function toSession(user: OidcUserLike | null): AuthSession | null {
  if (!user || user.expired || !user.access_token) return null;
  const displayName = user.profile.name ?? user.profile.preferred_username ?? null;
  return {
    accessToken: user.access_token,
    user: {
      id: user.profile.sub,
      email: user.profile.email ?? null,
      user_metadata: { full_name: displayName, name: displayName },
      app_metadata: { provider: "keycloak" },
      created_at: null,
    },
  };
}

export function createKeycloakAuthClient(opts: {
  userManager: UserManagerLike;
  issuer: string;
}): AuthClient {
  const { userManager, issuer } = opts;
  const getSession = async () => toSession(await userManager.getUser());

  /**
   * A renovação em curso, quando há uma.
   *
   * Existe para DEDUPLICAR. Enquanto um upload longo está em voo, o polling do status continua
   * pedindo token: sem isto, cada pedido dispararia seu próprio `signinSilent`, e vários
   * resgates concorrentes do mesmo `refresh_token` fazem o Keycloak invalidar a sessão quando a
   * rotação de refresh token está ligada — trocando uma expiração recuperável por um logout.
   */
  let renovacaoEmCurso: Promise<AuthSession | null> | null = null;

  async function renovar(): Promise<AuthSession | null> {
    if (!renovacaoEmCurso) {
      renovacaoEmCurso = (async () => {
        try {
          return toSession(await userManager.signinSilent());
        } catch {
          // Falhou de verdade: refresh token expirado, revogado, ou o IdP fora do ar. Devolver
          // `null` mantém o comportamento anterior — quem chama trata como sessão ausente.
          return null;
        } finally {
          // Liberado no `finally` para que a PRÓXIMA expiração possa tentar de novo. Guardar a
          // promise resolvida faria a segunda expiração reusar o resultado da primeira.
          renovacaoEmCurso = null;
        }
      })();
    }
    return renovacaoEmCurso;
  }

  return {
    provider: "keycloak",
    getSession,
    /**
     * O token para a próxima requisição — renovando se o atual já venceu.
     *
     * ## O incidente que originou esta renovação
     *
     * Medido em homologação em 2026-08-25: um upload de 100 MB foi ABORTADO aos 121 segundos.
     * `performance.getEntriesByType` registrou a requisição com `responseStatus: 0` e
     * `transferSize: 0` — o assinalamento de requisição cancelada, não de resposta HTTP. Nada
     * chegou ao storage, e a análise ficou órfã com a tela dizendo "Receiving".
     *
     * A cadeia: o token venceu durante o upload → o POLLING do status (um `GET` acessório) pediu
     * token → `getUser()` devolveu um usuário `expired` → `toSession` devolveu `null` →
     * `getAccessToken` devolveu `null` → o cliente `/v1` levantou `authentication_required` sem
     * tocar a rede → o `onError` do QueryCache navegou para `/session-expired` → a navegação
     * desmontou o componente e matou o upload em voo.
     *
     * No `localStorage`, o `refresh_token` estava lá, intacto, sem ter sido usado.
     *
     * ## Por que aqui, e não só no timer
     *
     * `automaticSilentRenew: true` já está configurado (`lib/auth/index.ts`) e ele é um TIMER —
     * dispara uma vez, e se falhar não há segunda chance. `userManager.getUser()` não renova:
     * ele lê o store.
     *
     * Renovar sob demanda torna a recuperação uma propriedade do CAMINHO em vez de um
     * agendamento: qualquer requisição que precise de token e não tenha um válido tenta obter um
     * antes de declarar a sessão perdida.
     */
    async getAccessToken() {
      const atual = await getSession();
      if (atual) return atual.accessToken;
      return (await renovar())?.accessToken ?? null;
    },
    onAuthStateChange(cb) {
      const onLoaded = (u: OidcUserLike) => cb(toSession(u));
      const onUnloaded = () => cb(null);
      userManager.events.addUserLoaded(onLoaded);
      userManager.events.addUserUnloaded(onUnloaded);
      return () => {
        userManager.events.removeUserLoaded(onLoaded);
        userManager.events.removeUserUnloaded(onUnloaded);
      };
    },
    async signOut() {
      await userManager.signoutRedirect();
    },
    async startLogin(nextPath?: string, opts?: { idpHint?: "google" | "github" }) {
      await userManager.signinRedirect({
        state: { next: nextPath },
        // kc_idp_hint: Keycloak pula a própria tela e vai direto ao IdP (Google/GitHub)
        ...(opts?.idpHint ? { extraQueryParams: { kc_idp_hint: opts.idpHint } } : {}),
      });
    },
    // Keycloak-hosted login carrega os links de Registro/Esqueci-senha (realm com
    // registrationAllowed/resetPasswordAllowed). Redirecionamos ao mesmo fluxo.
    async startRegister(nextPath?: string) {
      await userManager.signinRedirect({ state: { next: nextPath } });
    },
    async startPasswordReset() {
      await userManager.signinRedirect({ state: { next: undefined } });
    },
    async completeLoginCallback() {
      return toSession(await userManager.signinRedirectCallback());
    },
    accountManagementUrl() {
      return `${issuer}/account`;
    },
    supportsPasswordForms() {
      return false;
    },
  };
}
