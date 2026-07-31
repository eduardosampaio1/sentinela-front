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

  // A jornada AUTENTICADA completa (prepare → upload sem materialização → submit → 7 estados →
  // refresh/deep-link → troca de workspace → upload grande) está especificada em
  // docs/onda6/E2-playwright.md e provada nos 30+ testes vitest+MSW. Falta apenas o fixture de
  // login controlado (seed de sessão Supabase / mock de auth em browser) para exercê-la aqui —
  // marcada como pendente para NÃO produzir falso verde.
  test.fixme("jornada autenticada completa (requer fixture de login controlado)", async () => {});
});
