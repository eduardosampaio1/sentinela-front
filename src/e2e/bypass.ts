// Bypass de autenticação EXCLUSIVO de teste E2E (Onda 6 E3 reconciliação, item 1).
//
// Este módulo só é `import()`-ado por `main.tsx` sob o gate `import.meta.env.DEV &&
// import.meta.env.VITE_E2E === "true"`. Em build de produção `import.meta.env.DEV` é o literal
// `false`, então o Rollup NÃO inclui este arquivo no bundle — o token/sessão fixos abaixo
// jamais chegam a produção. Ver o cadeado em `src/lib/auth/e2eBridge.ts` e a prova de bundle
// em `src/test/v1/e2e-bypass-lockdown.test.ts`.

import type { AuthSession } from "@/lib/auth/types";
import type { Workspace } from "@/lib/workspaces";
import { setE2EInjection } from "@/lib/auth/e2eBridge";
import { enableSessionJourneyStore, makeJourneyHandlers, resetJourney, seedJourney } from "@/test/msw/journey";

const E2E_SESSION: AuthSession = {
  accessToken: "e2e-local-session-not-a-real-credential",
  user: {
    id: "e2e-user-0000",
    email: "e2e@sentinela.test",
    user_metadata: { full_name: "E2E Reviewer" },
    app_metadata: {},
    created_at: "2020-01-01T00:00:00.000Z",
  },
};

const E2E_WORKSPACE: Workspace = {
  id: "e2e-workspace-0000",
  name: "E2E Workspace",
  slug: "e2e",
  owner_user_id: "e2e-user-0000",
  created_at: "2020-01-01T00:00:00.000Z",
  updated_at: "2020-01-01T00:00:00.000Z",
  deleted_at: null,
};

/**
 * Injeta a sessão/workspace de teste no contexto e sobe o MSW browser worker com a sequência
 * stateful do contrato público. Idempotente; seguro para chamar em cada reload do Playwright.
 */
export async function installE2EBypass(): Promise<void> {
  enableSessionJourneyStore(); // determinístico por analysis_id, sobrevive ao reload
  setE2EInjection({ session: E2E_SESSION, workspace: E2E_WORKSPACE });

  const { setupWorker } = await import("msw/browser");
  // Handlers na MESMA origem do dev server (evita CORS do SW em cross-origin).
  const worker = setupWorker(...makeJourneyHandlers(window.location.origin));
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });

  // expostos p/ os specs controlarem a sequência entre cenários (determinístico por analysis_id)
  const bag = globalThis as unknown as Record<string, unknown>;
  bag.__SENTINELA_E2E_RESET__ = () => resetJourney();
  bag.__SENTINELA_E2E_SEED__ = (id: string, seq: string[], retryAllowed = false) =>
    seedJourney(id, seq as never, retryAllowed);
}
