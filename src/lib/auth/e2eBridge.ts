// Ponte fail-closed para o bypass de autenticação de teste (Onda 6 E3 reconciliação, item 1).
//
// CADEADO DE SEGURANÇA: todo caminho aqui é guardado por `import.meta.env.DEV`, que o Vite
// substitui pelo literal `false` em build de produção — o minificador então ELIMINA o ramo
// (dead-code elimination). Consequências garantidas:
//   • Impossível ativar o bypass num build de produção, mesmo setando o global em runtime.
//   • Este arquivo NÃO contém token/sessão fixos — apenas lê o estado que o módulo
//     dev-only `src/e2e/bypass.ts` injeta. Aquele módulo só é `import()`-ado sob o mesmo
//     gate, então o token fixo nunca entra no bundle de produção.
// A sessão E2E é 100% local: não consulta Supabase, Keycloak, nem qualquer backend de identidade.

import type { AuthClient, AuthSession } from "./types";

// Forma ESTRUTURAL mínima do Workspace. Evita `import` de `@/lib/workspaces` (legado) aqui —
// esse import arrastaria o módulo legado para a camada canônica PURA. O módulo dev-only
// `src/e2e/bypass.ts` constrói o objeto tipado como o `Workspace` real (assignável por estrutura).
export interface E2EWorkspace {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface E2EInjection {
  session: AuthSession;
  workspace: E2EWorkspace;
}

const GLOBAL_KEY = "__SENTINELA_E2E_BYPASS__";

function slot(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>;
}

/** Lê a injeção E2E. `null` em produção (gate morto) ou quando nada foi injetado. */
export function readE2EInjection(): E2EInjection | null {
  if (!import.meta.env.DEV) return null; // fail-closed: literal em produção
  const injected = slot()[GLOBAL_KEY];
  if (!injected || typeof injected !== "object") return null;
  const candidate = injected as Partial<E2EInjection>;
  if (!candidate.session?.accessToken || !candidate.workspace?.id) return null;
  return candidate as E2EInjection;
}

export function setE2EInjection(injection: E2EInjection): void {
  if (!import.meta.env.DEV) return; // nunca em produção
  slot()[GLOBAL_KEY] = injection;
}

export function clearE2EInjection(): void {
  slot()[GLOBAL_KEY] = undefined;
}

/** true só quando estamos em DEV E há uma injeção válida. */
export function isE2EBypassActive(): boolean {
  return readE2EInjection() !== null;
}

/**
 * AuthClient puramente local a partir da sessão injetada. Não fala com nenhum backend.
 * `onAuthStateChange` emite `null` no signOut para destravar o fluxo de logout.
 */
export function createE2EAuthClient(initial: AuthSession): AuthClient {
  let current: AuthSession | null = initial;
  const listeners = new Set<(session: AuthSession | null) => void>();
  return {
    provider: "supabase",
    async getSession() {
      return current;
    },
    async getAccessToken() {
      return current?.accessToken ?? null;
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    async signOut() {
      current = null;
      clearE2EInjection();
      listeners.forEach((cb) => cb(null));
    },
    async startLogin() {
      /* no-op: já autenticado no ambiente E2E */
    },
    async startRegister() {
      /* no-op */
    },
    async startPasswordReset() {
      /* no-op */
    },
    async completeLoginCallback() {
      return current;
    },
    accountManagementUrl() {
      return null;
    },
    supportsPasswordForms() {
      return true;
    },
  };
}
