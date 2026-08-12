// E4 — listagem, histórico e retomada em browser real (Onda 6 E4, item 10).
//
// Pré-semeia (via sessionStorage, antes do load) a listagem por (workspace, cursor) e a sequência
// de detalhe por analysis_id. Cobre: lista, paginação por cursor opaco (sem duplicação), retomada
// (running→completed) e refresh (reconstrói por analysis_id). Só chamadas /v1; workspace-scoped.
//
// Isolamento entre workspaces é provado no nível de componente
// (src/features/canonical-analysis/ui/AnalysesListPage.test.tsx: cursor zerado na troca + nenhum
// cursor cruza workspace + chaves prefixadas por workspace), onde a troca de identidade é
// diretamente controlável; aqui a fixture de auth E2E injeta um workspace determinístico único.

import { expect, test, type Page } from "@playwright/test";

const WS = "e2e-workspace-0000"; // = E2E_WORKSPACE.id da fixture

const li = (id: string, status: string, result = true) => ({
  analysis_id: id,
  status,
  record_count: 4,
  result_available: result,
  created_at: "2020-01-02T00:00:00Z",
});

async function seed(page: Page) {
  await page.addInitScript(
    ([ws]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_list__",
        JSON.stringify({
          [`${ws}|`]: {
            items: [
              { analysis_id: "an-list-1", status: "running", record_count: 4, result_available: false, created_at: "2020-01-02T00:00:00Z" },
              { analysis_id: "an-list-2", status: "completed", record_count: 9, result_available: true, created_at: "2020-01-01T00:00:00Z" },
            ],
            next_cursor: "cur-2",
          },
          [`${ws}|cur-2`]: {
            items: [{ analysis_id: "an-list-3", status: "completed", record_count: 2, result_available: true, created_at: "2019-12-31T00:00:00Z" }],
            next_cursor: null,
          },
        }),
      );
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({ "an-list-1": { seq: ["running", "running", "completed"], idx: 0, retryAllowed: false } }),
      );
    },
    [WS],
  );
}

test.describe("E4 — listagem, histórico e retomada (browser real)", () => {
  test("lista: itens do workspace com estado público; só /v1 e workspace-scoped", async ({ page, baseURL }) => {
    const listReqs: string[] = [];
    let legacy = 0;
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (baseURL && u.origin === new URL(baseURL).origin) {
        if (/^\/(api|rest|graphql|auth)\//.test(u.pathname)) legacy += 1;
        if (u.pathname === "/v1/analyses" && req.method() === "GET") listReqs.push(u.searchParams.get("workspace_id") ?? "");
      }
    });
    await seed(page);
    await page.goto("/canonical/analyses");

    await expect(page.getByText("an-list-1")).toBeVisible();
    await expect(page.getByText("an-list-2")).toBeVisible();
    await expect(page.getByText("Running")).toBeVisible();
    expect(legacy, "sem chamadas legadas").toBe(0);
    expect(listReqs.length, "a listagem chamou /v1/analyses").toBeGreaterThan(0);
    expect(listReqs.every((w) => w === WS), "toda listagem é workspace-scoped").toBe(true);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });

  test("paginação: próxima usa o cursor opaco → 2ª página sem duplicar; volta retorna", async ({ page }) => {
    const cursors: (string | null)[] = [];
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (u.pathname === "/v1/analyses" && req.method() === "GET") cursors.push(u.searchParams.get("cursor"));
    });
    await seed(page);
    await page.goto("/canonical/analyses");
    await expect(page.getByText("an-list-1")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("an-list-3")).toBeVisible();
    await expect(page.getByText("an-list-1")).toHaveCount(0); // trocou de página, sem concatenar

    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText("an-list-1")).toBeVisible();

    expect(cursors[0]).toBeNull(); // 1ª página sem cursor
    expect(cursors).toContain("cur-2"); // 2ª página com o cursor OPACO recebido
  });

  test("retomada: abrir análise em execução → detalhe → polling → completed", async ({ page }) => {
    await seed(page);
    await page.goto("/canonical/analyses");
    await page.getByRole("link", { name: /Open analysis an-list-1/i }).click();
    // `/analyses/…`, não `/canonical/analyses/…`: `f182e4b` (M24) tirou o nome de camada interna
    // da URL pública. A entrada acima segue pelo endereço antigo, que hoje é redirect.
    await page.waitForURL(/\/analyses\/an-list-1/);
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 30_000 });
  });

  test("refresh: no detalhe, reload reconstrói pelo analysis_id da URL → completed", async ({ page }) => {
    await seed(page);
    await page.goto("/canonical/analyses/an-list-1");
    await expect(page.getByRole("heading", { name: /Running|Completed/ })).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByTestId("canonical-analysis-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 30_000 });
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`responsivo (${vp.nome}): lista utilizável, sem overflow horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await seed(page);
      await page.goto("/canonical/analyses");
      await expect(page.getByText("an-list-1")).toBeVisible();
      await expect(page.getByRole("link", { name: /Open analysis an-list-1/i })).toBeInViewport();
      const excesso = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(excesso, "sem overflow horizontal").toBeLessThanOrEqual(1);
    });
  }
});
