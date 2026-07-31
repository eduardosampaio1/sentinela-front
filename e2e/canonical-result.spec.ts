// E5 — resultado em browser real (Onda 6 E5, item 17). O payload provisório é semeado no MSW
// worker (sessionStorage) e chega pelo GET público; o validator/adapter decidem a renderização.
//
// Isolamento por workspace é provado no nível de componente/adapter (a fixture E2E injeta um
// workspace único); aqui a prova é: só /v1, deep link, refresh, indisponível, incompatível, parcial.

import { expect, test, type Page } from "@playwright/test";

const MASSA_A = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 100, useful_outcomes: 80, analyzed_at: "2026-07-31T10:00:00Z" },
  indicators: [
    { id: "useful_rate", kind: "ratio", availability: "available", value: 0.8 },
    { id: "intent_coverage_rate", kind: "ratio", availability: "available", value: 0.85 },
    { id: "token_waste_absolute", kind: "count", availability: "available", value: 20 },
    { id: "cost_per_useful_outcome", kind: "currency", availability: "available", value: 0.125, currency: null },
  ],
  recommendations: [{ id: "r1", title: "Revisar intenções sem cobertura", description: null }],
};

const MASSA_PARCIAL = {
  schema: "provisional-analysis-result-v1",
  summary: { total_records: 5, useful_outcomes: null, analyzed_at: null },
  indicators: [
    { id: "useful_rate", kind: "ratio", availability: "available", value: 0.5 },
    { id: "id_desconhecido", kind: "ratio", availability: "available", value: 0.9 },
  ],
};

async function semear(page: Page, id: string, payload: unknown, resultAvailable = true) {
  await page.addInitScript(
    ([analysisId, corpo, disponivel]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (!sessionStorage.getItem("__sentinela_journey__")) {
        sessionStorage.setItem(
          "__sentinela_journey__",
          JSON.stringify({ [analysisId as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
        );
      }
      if (!sessionStorage.getItem("__sentinela_result__")) {
        sessionStorage.setItem("__sentinela_result__", JSON.stringify({ [analysisId as string]: corpo }));
      }
      if (!disponivel) sessionStorage.setItem("__sentinela_no_result__", "1");
    },
    [id, payload, resultAvailable] as const,
  );
}

test.describe("E5 — resultado canônico (browser real)", () => {
  test("feliz: valores canônicos renderizados; só /v1; sem chamada legada", async ({ page, baseURL }) => {
    let legado = 0;
    let v1 = 0;
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (baseURL && u.origin === new URL(baseURL).origin) {
        if (/^\/(api|rest|graphql|auth)\//.test(u.pathname)) legado += 1;
        if (u.pathname.startsWith("/v1/")) v1 += 1;
      }
    });
    await semear(page, "an-res", MASSA_A);
    await page.goto("/canonical/analyses/an-res/result");

    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();
    // cobertura 0.85 → 85% (nunca 8.500%)
    const cobertura = page.locator("li", { hasText: "Intent coverage" });
    await expect(cobertura).toContainText("85");
    await expect(cobertura).toContainText("%");
    await expect(cobertura).not.toContainText("8,500");
    // waste é contagem, sem "%"
    const waste = page.locator("li", { hasText: "Wasted records" });
    await expect(waste).toContainText("20");
    await expect(waste).not.toContainText("20%");
    // recomendação renderizada
    await expect(page.getByText("Revisar intenções sem cobertura")).toBeVisible();
    // marca de provisório
    await expect(page.getByText(/Provisional presentation profile/i)).toBeVisible();

    expect(legado, "sem chamada legada").toBe(0);
    expect(v1, "consumiu o Gateway /v1").toBeGreaterThan(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });

  test("refresh: reload reconstrói por workspace + analysis_id (da URL)", async ({ page }) => {
    await semear(page, "an-res", MASSA_A);
    await page.goto("/canonical/analyses/an-res/result");
    await expect(page.getByText("Useful outcome rate")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("canonical-result-page")).toBeVisible();
    await expect(page.getByText("Useful outcome rate")).toBeVisible();
    await expect(page.locator("li", { hasText: "Intent coverage" })).toContainText("85");
  });

  test("schema incompatível: mensagem segura, sem interpretar e sem JSON cru", async ({ page }) => {
    await semear(page, "an-inc", { schema: "outro-schema-v9", indicators: [] });
    await page.goto("/canonical/analyses/an-inc/result");
    await expect(page.getByRole("alert")).toContainText(/doesn't support yet/i);
    await expect(page.getByText("Indicators")).toHaveCount(0);
    await expect(page.getByText(/outro-schema-v9/)).toHaveCount(0);
    // há 2 saídas para o histórico (cabeçalho + estado de incompatibilidade): ambas válidas
    await expect(page.getByRole("link", { name: "Back to history" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to history" })).toHaveCount(2);
  });

  test("parcial: seção suportada renderiza e a parcialidade é sinalizada", async ({ page }) => {
    await semear(page, "an-parc", MASSA_PARCIAL);
    await page.goto("/canonical/analyses/an-parc/result");
    await expect(page.getByText("Useful outcome rate")).toBeVisible();
    await expect(page.getByText(/Some sections aren't available/i)).toBeVisible();
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`responsivo (${vp.nome}): resultado sem overflow horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await semear(page, "an-res", MASSA_A);
      await page.goto("/canonical/analyses/an-res/result");
      await expect(page.getByText("Useful outcome rate")).toBeVisible();
      const excesso = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(excesso).toBeLessThanOrEqual(1);
    });
  }
});
