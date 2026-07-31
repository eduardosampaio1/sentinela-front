import { expect, test } from "@playwright/test";

test.describe("Jornada canônica — rota fiada e protegida (browser real)", () => {
  test("app viva sobe e a landing responde", async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.ok()).toBeTruthy();
  });

  test("flag ON + não-autenticado: /canonical/analyses/new redireciona para /login", async ({ page }) => {
    // Prova em browser real: a rota canônica está montada sob ProtectedRoute e a flag está ligada
    // (webServer). Sem sessão, o guard redireciona para /login — a rota existe e é protegida.
    await page.goto("/canonical/analyses/new");
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    expect(page.url()).toContain("/login");
  });

  // A jornada AUTENTICADA completa (happy/refresh/recovering) agora É exercida em browser real —
  // ver `e2e/canonical-authenticated.spec.ts` — via o fixture de auth E2E fail-closed
  // (`src/lib/auth/e2eBridge.ts` + `src/e2e/bypass.ts`) e o MSW browser worker stateful.
});
