// Jornada canônica AUTENTICADA em browser real (Onda 6 E3 reconciliação, item 2).
//
// Usa o bypass de auth E2E fail-closed (opt-in por teste via addInitScript) + o MSW browser worker
// com a sequência stateful por analysis_id. Prova: happy path só com chamadas /v1, mesmo
// analysis_id, sem 2º upload no submit, sem indicador/percentual, ação terminal coerente; refresh
// reconstrói pelo analysis_id a partir da URL; recovering não é erro definitivo.

import { expect, test } from "@playwright/test";

/** Liga o estado autenticado ANTES do carregamento da app (survive reload). */
async function enableAuth(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

const JSONL = { name: "data.jsonl", mimeType: "application/x-ndjson", buffer: Buffer.from('{"a":1}\n') };

test.describe("Jornada canônica autenticada (browser real + MSW stateful)", () => {
  test("happy: prepare→upload→submit→estados→completed, só /v1, sem 2º upload", async ({ page, baseURL }) => {
    const legacy: string[] = [];
    let dataUploads = 0;
    let v1Calls = 0;
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (baseURL && u.origin === new URL(baseURL).origin) {
        if (/^\/(api|rest|graphql|auth)\//.test(u.pathname)) legacy.push(`${req.method()} ${u.pathname}`);
        if (u.pathname.startsWith("/v1/")) {
          v1Calls += 1;
          if (u.pathname.endsWith("/data") && req.method() === "POST") dataUploads += 1;
        }
      }
    });

    await enableAuth(page);
    await page.goto("/canonical/analyses/new");

    // autenticado: NÃO redireciona p/ login; a entrada da jornada aparece
    await expect(page.getByRole("button", { name: "Start analysis" })).toBeVisible();
    await page.getByRole("button", { name: "Start analysis" }).click();

    // identidade durável: navega p/ /canonical/analyses/an-e2e
    await page.waitForURL(/\/canonical\/analyses\/an-e2e/);

    // upload sem materialização (File direto)
    await page.setInputFiles("#canonical-file", JSONL);
    await page.getByRole("button", { name: "Send dataset" }).click();

    // receiving → submit (reusa o MESMO analysis_id; não refaz upload)
    await page.getByRole("button", { name: "Submit for analysis" }).click();

    // acompanha até completed (passa por recovering; NUNCA % nem progressbar)
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("button", { name: "View result" })).toBeDisabled();

    expect(legacy, "nenhuma chamada legada (/api|/rest|/graphql|/auth)").toEqual([]);
    expect(v1Calls, "a jornada fala com o Gateway /v1").toBeGreaterThan(0);
    expect(dataUploads, "submit NÃO refaz upload (exatamente 1 POST /data)").toBe(1);
    await expect(page.getByRole("progressbar")).toHaveCount(0); // sem indicador/percentual
  });

  test("refresh: em progresso → reload reconstrói por analysis_id (da URL) → completed", async ({ page }) => {
    await enableAuth(page);
    await page.goto("/canonical/analyses/new");
    await page.getByRole("button", { name: "Start analysis" }).click();
    await page.waitForURL(/\/canonical\/analyses\/an-e2e/);
    await page.setInputFiles("#canonical-file", JSONL);
    await page.getByRole("button", { name: "Send dataset" }).click();
    await page.getByRole("button", { name: "Submit for analysis" }).click();

    // um estado em progresso aparece
    await expect(page.getByRole("heading", { name: /Queued|Running|Recovering/ })).toBeVisible({ timeout: 20_000 });

    // RELOAD: a app monta do ZERO a partir da URL (não do Context/File em memória)
    await page.reload();
    // monta direto no acompanhamento (não na entrada nem no upload)
    await expect(page.getByTestId("canonical-analysis-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start analysis" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send dataset" })).toHaveCount(0);

    // e converge para completed pela sequência persistida por analysis_id
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
  });

  test("recovering NÃO é erro definitivo: aparece como progresso e a jornada continua", async ({ page }) => {
    // pré-semeia a sequência do analysis_id ANTES do load (determinístico, sem corrida)
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({
          "an-rec": { seq: ["recovering", "recovering", "running", "completed"], idx: 0, retryAllowed: false },
        }),
      );
    });
    await page.goto("/canonical/analyses/an-rec");

    // recovering é apresentado EM PROGRESSO (sem ação de erro/retry — não é definitivo)
    await expect(page.getByRole("heading", { name: "Recovering" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);

    // a jornada avança (recovering é transitório, não terminal)
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
  });
});
