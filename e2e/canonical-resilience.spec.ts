// E6 — retry, erros e resiliência em browser real (Onda 6 E6, item 25).
//
// Pré-semeia (sessionStorage) o estado por analysis_id. Cobre: retry recuperável (recovering→
// completed), falha NÃO recuperável (sem retry, oferece nova análise), resposta perdida (retry
// aceito → reload → reconstrói por analysis_id, sem 2ª mutation automática) e sessão expirada (401).
// A matriz completa dos 9 erros (capacity/idempotency/result_not_available/…) é provada em vitest.

import { expect, test, type Page } from "@playwright/test";

async function seedAuthAnd(page: Page, journey: Record<string, unknown>, errors?: Record<string, unknown>) {
  await page.addInitScript(
    ([j, e]) => {
      // O flag de auth é sempre necessário (roda a cada load). Os STORES são semeados só se
      // ausentes → um reload NÃO sobrescreve o avanço de estado feito pelo retry (resposta perdida).
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (!sessionStorage.getItem("__sentinela_journey__")) sessionStorage.setItem("__sentinela_journey__", JSON.stringify(j));
      if (e && !sessionStorage.getItem("__sentinela_status_error__")) sessionStorage.setItem("__sentinela_status_error__", JSON.stringify(e));
    },
    [journey, errors ?? null],
  );
}

test.describe("E6 — resiliência da jornada (browser real)", () => {
  test("recuperável: failed+retry_allowed → retry → recovering → completed", async ({ page }) => {
    await seedAuthAnd(page, { "an-fail": { seq: ["failed"], idx: 0, retryAllowed: true } });
    await page.goto("/canonical/analyses/an-fail");
    await expect(page.getByRole("heading", { name: /Couldn't complete/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
  });

  test("não recuperável: failed+retry_allowed=false → sem retry, oferece nova análise", async ({ page }) => {
    await seedAuthAnd(page, { "an-nofix": { seq: ["failed"], idx: 0, retryAllowed: false } });
    await page.goto("/canonical/analyses/an-nofix");
    await expect(page.getByRole("heading", { name: /Couldn't complete/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New analysis" })).toBeVisible();
  });

  test("resposta perdida: retry aceito → reload → reconstrói por analysis_id, SEM 2ª mutation", async ({ page }) => {
    let retryPosts = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && new URL(req.url()).pathname.endsWith("/retry")) retryPosts += 1;
    });
    await seedAuthAnd(page, { "an-lost": { seq: ["failed"], idx: 0, retryAllowed: true } });
    await page.goto("/canonical/analyses/an-lost");
    await page.getByRole("button", { name: "Try again" }).click();
    // retry ACEITO pelo backend: o estado avança (recovering/running) — o store persistiu
    await expect(page.getByRole("heading", { name: /Recovering|Running/ })).toBeVisible({ timeout: 20_000 });
    // "perde" a resposta / descarta o estado em memória: reload reconstrói só a partir da URL
    await page.reload();
    await expect(page.getByTestId("canonical-analysis-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
    expect(retryPosts, "nenhum retry automático após o reload (1 clique = 1 mutation)").toBe(1);
  });

  test("sessão expirada: 401 na leitura → sai da rota canônica (session-expired/login)", async ({ page }) => {
    await seedAuthAnd(page, { "an-401": { seq: ["running"], idx: 0, retryAllowed: false } }, {
      "an-401": { http: 401, code: "authentication_required" },
    });
    await page.goto("/canonical/analyses/an-401");
    await page.waitForURL(/\/(session-expired|login)/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/(session-expired|login)/);
  });
});
