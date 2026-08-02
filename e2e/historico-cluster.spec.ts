// Onda 8 / Macrofrente 1 — cluster de histórico em browser real.
//
// Os testes de componente já provam a mecânica (HistoryPage.test.tsx, RunRow, historicoView). O
// que SÓ o browser prova é o que aqueles não alcançam: que a página montada de verdade, com o
// router, o cliente de query e o service worker reais, não emite nenhuma requisição à camada
// legada — nem por um efeito colateral esquecido em algum provider acima dela.
//
// Por isso o gate de rede aqui é um observador de TODAS as requisições da origem, não um espião
// numa função. Uma chamada que sobrevivesse num `useEffect` de contexto passaria despercebida
// por um mock de módulo e é exatamente o que este arquivo pega.
//
// Isolamento entre workspaces: a fixture de auth E2E injeta UM workspace determinístico, então o
// que se prova aqui é que toda requisição carrega esse workspace e nenhuma outra. A troca de
// identidade — que exige duas sessões — é provada no nível de componente, onde ela é
// controlável (AnalysesListPage.test.tsx).

import { expect, test, type Page } from "@playwright/test";

const WS = "e2e-workspace-0000"; // = E2E_WORKSPACE.id da fixture

const ROTA_LEGADA = /^\/(api|rest|graphql|auth)\//;

type Linha = {
  analysis_id: string;
  status: string;
  record_count: number;
  result_available: boolean;
  created_at: string | null;
  engine_version?: string | null;
  observed_conversations?: number | null;
};

const ANTIGA: Linha = {
  analysis_id: "an-hist-antiga",
  status: "completed",
  record_count: 40,
  result_available: true,
  created_at: "2020-01-01T00:00:00Z",
  engine_version: "1.4.0",
  observed_conversations: 12,
};

// Sem `engine_version` e sem `observed_conversations`: é o caso que separa ausência de zero.
const NOVA: Linha = {
  analysis_id: "an-hist-nova",
  status: "completed",
  record_count: 90,
  result_available: true,
  created_at: "2020-03-01T00:00:00Z",
};

async function semear(page: Page, itens: Linha[] = [NOVA, ANTIGA]) {
  await page.addInitScript(
    ([ws, dados]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_list__",
        JSON.stringify({ [`${ws}|`]: { items: dados, next_cursor: null } }),
      );
    },
    [WS, itens] as const,
  );
}

/** Observa a origem inteira: rotas legadas, `/v1` e o `workspace_id` de cada chamada. */
function observarRede(page: Page, baseURL: string | undefined) {
  const legadas: string[] = [];
  const v1: { path: string; workspace: string | null }[] = [];
  page.on("request", (req) => {
    if (!baseURL) return;
    const u = new URL(req.url());
    if (u.origin !== new URL(baseURL).origin) return;
    if (ROTA_LEGADA.test(u.pathname)) legadas.push(`${req.method()} ${u.pathname}`);
    if (u.pathname.startsWith("/v1/")) {
      v1.push({ path: u.pathname, workspace: u.searchParams.get("workspace_id") });
    }
  });
  return { legadas, v1 };
}

test.describe("Onda 8 — cluster de histórico (browser real)", () => {
  test("histórico: lista pelo /v1, sem rota legada, tudo no workspace autenticado", async ({
    page,
    baseURL,
  }) => {
    const rede = observarRede(page, baseURL);
    await semear(page);
    await page.goto("/dashboard/history");

    await expect(page.getByTestId("run-row-an-hist-nova")).toBeVisible();
    await expect(page.getByTestId("run-row-an-hist-antiga")).toBeVisible();

    expect(rede.legadas, "nenhuma rota legada").toEqual([]);

    const lista = rede.v1.filter((r) => r.path === "/v1/analyses");
    expect(lista.length, "a listagem foi chamada").toBeGreaterThan(0);
    for (const r of rede.v1) {
      if (r.workspace !== null) expect(r.workspace, "só o workspace autenticado").toBe(WS);
    }
  });

  test("histórico: uma requisição por página — nenhuma chamada de /result por linha", async ({
    page,
    baseURL,
  }) => {
    // O N+1 que a decisão de produto proibiu. Com duas linhas na tela, abrir a lista não pode
    // disparar `/result` nenhuma vez: o custo cresceria com o tamanho do histórico.
    const rede = observarRede(page, baseURL);
    await semear(page);
    await page.goto("/dashboard/history");
    await expect(page.getByTestId("run-row-an-hist-nova")).toBeVisible();

    const results = rede.v1.filter((r) => /\/result$/.test(r.path));
    expect(results, "abrir a lista não busca resultado por linha").toEqual([]);
  });

  test("histórico: ausência aparece como ausência, não como zero", async ({ page }) => {
    await semear(page);
    await page.goto("/dashboard/history");

    const nova = page.getByTestId("run-row-an-hist-nova");
    await expect(nova).toBeVisible();
    // A linha sem `observed_conversations` marca a célula como indisponível; a com o valor
    // medido marca como medida. Se a fronteira colapsasse ausência em 0, as duas ficariam iguais.
    await expect(nova.locator('[data-estado="indisponivel"]').first()).toBeVisible();
    await expect(
      page.getByTestId("run-row-an-hist-antiga").locator('[data-estado="medido"]').first(),
    ).toBeVisible();
  });

  test("comparação: exatamente duas chamadas de /result, disparadas pela ação", async ({
    page,
    baseURL,
  }) => {
    const rede = observarRede(page, baseURL);
    await semear(page);
    await page.goto("/dashboard/history");
    await expect(page.getByTestId("run-row-an-hist-nova")).toBeVisible();

    expect(rede.v1.filter((r) => /\/result$/.test(r.path)), "nada antes da ação").toEqual([]);

    await page.getByRole("button", { name: "Enter compare mode" }).click();
    await page.getByTestId("run-row-an-hist-antiga").click();
    await page.getByTestId("run-row-an-hist-nova").click();
    await page.getByTestId("compare-now").click();

    await expect
      .poll(() => rede.v1.filter((r) => /\/result$/.test(r.path)).length, {
        message: "comparar busca os dois resultados, e só eles",
      })
      .toBe(2);
    expect(rede.legadas, "comparar não acorda o legado").toEqual([]);
  });

  test("launchpad: a outra tela migrada também monta e lê pelo /v1", async ({ page, baseURL }) => {
    // A `RecentRuns` do launchpad chama o MESMO `useAnalysesList` e estava na MESMA rota sem a
    // fundação. Era a segunda tela quebrada pelo mesmo defeito, e nenhum teste de componente
    // podia vê-lo — todos montam o provider por conta própria. Este caso existe para que a
    // fundação não volte a ser escopada à subárvore canônica sem alguém reclamar.
    const rede = observarRede(page, baseURL);
    await semear(page);
    await page.goto("/home");

    await expect(page.getByTestId("recent-records-an-hist-nova")).toBeVisible();
    expect(rede.legadas, "o launchpad não acorda o legado").toEqual([]);
    expect(rede.v1.filter((r) => r.path === "/v1/analyses").length).toBeGreaterThan(0);
  });

  test("detalhe: deep link legado chega ao renderizador canônico", async ({ page, baseURL }) => {
    const rede = observarRede(page, baseURL);
    await semear(page);
    await page.goto("/dashboard/history/an-hist-antiga");

    await expect(page).toHaveURL(/\/canonical\/analyses\/an-hist-antiga\/result$/);
    expect(rede.legadas, "o redirect não passa pelo legado").toEqual([]);
  });

  test("detalhe: o botão voltar não cai de novo no redirect", async ({ page }) => {
    // `replace` na navegação. Sem ele, voltar recarregaria a rota legada, que redirecionaria de
    // novo — o usuário ficaria preso na página de resultado.
    await semear(page);
    await page.goto("/dashboard/history");
    await expect(page.getByTestId("run-row-an-hist-antiga")).toBeVisible();

    await page.goto("/dashboard/history/an-hist-antiga");
    await expect(page).toHaveURL(/\/canonical\/analyses\/an-hist-antiga\/result$/);

    await page.goBack();
    await expect(page).not.toHaveURL(/\/canonical\/analyses\/an-hist-antiga\/result$/);
  });
});
