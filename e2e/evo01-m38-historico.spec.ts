// M38 · EVO-01 — histórico canônico em browser real.
//
// ## Procedência: esta spec era `historico-cluster.spec.ts`
//
// Ela provava o cluster legado de `/dashboard/history`, aposentado pela M38. As garantias NÃO
// morreram com a página: "a lista vem do `/v1`", "uma requisição por página", "ausência não vira
// zero" e "o deep link legado chega ao canônico" são invariantes de PRODUTO. O que mudou foi o
// endereço. Por isso a migração é `git mv` + reescrita, e não uma spec nova ao lado da velha
// apodrecendo.
//
// ## Três correções que NÃO são regressão da M38
//
// Ao migrar, dois casos apareceram vermelhos por drift anterior — e ficam registrados aqui para
// não serem relidos como defeito desta missão:
//
//   • `/canonical/analyses/{id}/result` era o destino esperado do deep link legado. A **M24**
//     tirou `canonical` da IA pública; o redirect entrega `/analyses/{id}/result` desde então.
//     A expectativa é que estava velha — vermelha desde 2026-08-09.
//   • `recent-records-*` era o gancho da Home legada, substituída pela **M32** em 2026-08-10.
//     O invariante que aquele caso protegia continua válido e sem cobertura, então ele migra —
//     mas medindo REDE, que é o que ele sempre quis dizer, em vez de um testid que morreu.
//
// A terceira mudança é de escopo: o caso de **comparação** alcançava `RunComparePanel` só através
// da `HistoryPage`. Comparação é EVO-02, dona **M39**. Ele sai daqui — sem `skip`, que seria
// esconderijo — e a cobertura browser de comparação renasce na superfície certa, na M39.

import { expect, test, type Page } from "@playwright/test";

const WS = "e2e-workspace-0000"; // = E2E_WORKSPACE.id da fixture
const ROTA_LEGADA = /^\/(api|rest|graphql|auth)\//;

type Linha = {
  analysis_id: string;
  status: string;
  record_count: number | null;
  result_available: boolean;
  created_at: string | null;
};

/** Duas linhas que separam AUSÊNCIA de ZERO — o invariante herdado da `RunRow`. */
const SEM_CONTAGEM: Linha = {
  analysis_id: "an-hist-sem-contagem",
  status: "completed",
  record_count: null,
  result_available: true,
  created_at: "2020-03-01T00:00:00Z",
};
const ZERO: Linha = {
  analysis_id: "an-hist-zero",
  status: "completed",
  record_count: 0,
  result_available: true,
  created_at: "2020-01-01T00:00:00Z",
};

/** Semeia o backend de listagem do journey. A chave é `${workspace}|${cursor}`. */
async function semear(page: Page, paginas: Record<string, { items: Linha[]; next_cursor: string | null }>) {
  await page.addInitScript(
    ([ws, dados]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      const mapa: Record<string, unknown> = {};
      for (const [cursor, pagina] of Object.entries(dados as Record<string, unknown>)) {
        mapa[`${ws}|${cursor}`] = pagina;
      }
      sessionStorage.setItem("__sentinela_list__", JSON.stringify(mapa));
    },
    [WS, paginas] as const,
  );
}

const UMA_PAGINA = { "": { items: [SEM_CONTAGEM, ZERO], next_cursor: null } };

/** Observa a origem inteira: rotas legadas, `/v1` e o `workspace_id` de cada chamada. */
function observarRede(page: Page, baseURL: string | undefined) {
  const legadas: string[] = [];
  const v1: { path: string; workspace: string | null }[] = [];
  page.on("request", (req) => {
    if (!baseURL) return;
    const u = new URL(req.url());
    if (u.origin !== new URL(baseURL).origin) return;
    if (ROTA_LEGADA.test(u.pathname)) legadas.push(`${req.method()} ${u.pathname}`);
    if (u.pathname.startsWith("/v1/")) v1.push({ path: u.pathname, workspace: u.searchParams.get("workspace_id") });
  });
  return { legadas, v1 };
}

const linha = (page: Page, id: string) => page.locator("li").filter({ hasText: id });

// ═════════════════════════════════════════════════════════════════════════════════════════════
// 1. Invariantes MIGRADOS da superfície aposentada
// ═════════════════════════════════════════════════════════════════════════════════════════════

test.describe("EVO-01 · invariantes migrados de /dashboard/history", () => {
  test("fonte: a lista vem do /v1, sem rota legada, no workspace autenticado", async ({ page, baseURL }) => {
    const rede = observarRede(page, baseURL);
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");

    await expect(linha(page, "an-hist-sem-contagem")).toBeVisible();
    await expect(linha(page, "an-hist-zero")).toBeVisible();

    expect(rede.legadas, "nenhuma rota legada").toEqual([]);
    expect(rede.v1.filter((r) => r.path === "/v1/analyses").length, "a listagem foi chamada").toBeGreaterThan(0);
    for (const r of rede.v1) {
      if (r.workspace !== null) expect(r.workspace, "só o workspace autenticado").toBe(WS);
    }
  });

  test("custo: abrir a lista NÃO busca resultado por linha", async ({ page, baseURL }) => {
    // O N+1 que a decisão de produto proibiu: o custo cresceria com o tamanho do histórico.
    const rede = observarRede(page, baseURL);
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");
    await expect(linha(page, "an-hist-zero")).toBeVisible();

    expect(rede.v1.filter((r) => /\/result$/.test(r.path)), "buscou /result por linha").toEqual([]);
  });

  test("ausência continua diferente de zero", async ({ page }) => {
    // Herdado da `RunRow`, que media `observed_conversations`. A superfície canônica apresenta
    // `record_count`, então o invariante migra para o campo que ELA mostra — e é observável na
    // copy, sem test hook: `null` vira "contagem não publicada", `0` vira "0 records".
    //
    // M45.2 — a copy mudou, o invariante não. Ela dizia "Records not available" / "Registros
    // indisponíveis", que é a palavra da QUEDA para o que é ausência de publicação. A casa já usa
    // "não publicado" para isso. O que este caso protege — ausência ≠ zero — segue idêntico.
    const naoPublicada = /Record count not published|Contagem não publicada/;
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");

    await expect(linha(page, "an-hist-sem-contagem")).toContainText(naoPublicada);
    // E a ausência não pode aparecer como zero — a direção que o caso sempre existiu para provar.
    await expect(linha(page, "an-hist-sem-contagem")).not.toContainText(/0 (records|registros)/);
    await expect(linha(page, "an-hist-zero")).toContainText(/0 (records|registros)/);
    await expect(linha(page, "an-hist-zero")).not.toContainText(naoPublicada);
  });

  test("a Home também monta e lê pelo /v1, sem acordar o legado", async ({ page, baseURL }) => {
    // Vinha do caso "launchpad", cujo gancho (`recent-records-*`) morreu com a Home legada na
    // M32. O invariante que ele protegia é outro e continua válido: a fundação canônica não pode
    // ser escopada só à subárvore de análise — se voltar a ser, uma segunda tela quebra em
    // silêncio. Medir REDE prova exatamente isso, e não depende de composição.
    const rede = observarRede(page, baseURL);
    await semear(page, UMA_PAGINA);
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(rede.legadas, "a Home acordou o legado").toEqual([]);
    expect(rede.v1.filter((r) => r.path === "/v1/analyses").length, "a Home não leu pelo /v1").toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// 2. Compatibilidade — a rota legada termina na canônica
// ═════════════════════════════════════════════════════════════════════════════════════════════

test.describe("EVO-01 · compatibilidade da rota aposentada", () => {
  test("/dashboard/history termina em /analyses, e a lista é a canônica", async ({ page, baseURL }) => {
    const rede = observarRede(page, baseURL);
    await semear(page, UMA_PAGINA);
    await page.goto("/dashboard/history");

    await expect(page).toHaveURL(/\/analyses$/);
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();
    expect(rede.legadas, "o redirect passou pelo legado").toEqual([]);
  });

  test("o deep link legado do detalhe chega ao renderizador canônico", async ({ page }) => {
    // CORREÇÃO DE DRIFT DA M24, não da M38: a expectativa antiga era
    // `/canonical/analyses/{id}/result`, e `canonical` deixou de ser IA pública naquela missão.
    await semear(page, UMA_PAGINA);
    await page.goto("/dashboard/history/an-hist-zero");
    await expect(page).toHaveURL(/\/analyses\/an-hist-zero\/result$/);
  });

  test("voltar não cai de novo no redirect", async ({ page }) => {
    // `replace` nas duas navegações. Sem ele o usuário fica preso: voltar recarregaria a rota
    // aposentada, que redirecionaria outra vez. O destino do "voltar" é a rota CANÔNICA — não se
    // exige retorno a `/dashboard/history`, que existe só como compatibilidade.
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();

    await page.goto("/dashboard/history/an-hist-zero");
    await expect(page).toHaveURL(/\/analyses\/an-hist-zero\/result$/);

    await page.goBack();
    await expect(page).not.toHaveURL(/\/analyses\/an-hist-zero\/result$/);
    await expect(page).toHaveURL(/\/analyses$/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// 3. Provas próprias da consolidação — cursor, ordem, estados
// ═════════════════════════════════════════════════════════════════════════════════════════════

const DUAS_PAGINAS = {
  "": { items: [SEM_CONTAGEM, ZERO], next_cursor: "cur-2" },
  "cur-2": { items: [{ ...ZERO, analysis_id: "an-hist-terceira", record_count: 7 }], next_cursor: null },
};

test.describe("EVO-01 · cursor, ordem e estados", () => {
  test("a segunda página vem do cursor recebido, sem repetir nem perder", async ({ page, baseURL }) => {
    const rede = observarRede(page, baseURL);
    await semear(page, DUAS_PAGINAS);
    await page.goto("/analyses");
    await expect(linha(page, "an-hist-sem-contagem")).toBeVisible();
    await expect(linha(page, "an-hist-terceira")).toHaveCount(0);

    await page.getByRole("button", { name: /Next|Próxima/ }).click();
    await expect(linha(page, "an-hist-terceira")).toBeVisible();
    // Substituição por cursor, não acúmulo com offset local.
    await expect(linha(page, "an-hist-sem-contagem")).toHaveCount(0);

    const listagens = rede.v1.filter((r) => r.path === "/v1/analyses");
    expect(listagens.length, "a 2ª página não pediu nada ao backend").toBeGreaterThan(1);

    await page.getByRole("button", { name: /Previous|Anterior/ }).click();
    await expect(linha(page, "an-hist-sem-contagem")).toBeVisible();
  });

  test("a ordem é a do backend — a tela não reordena", async ({ page }) => {
    // A massa vem propositalmente FORA de ordem cronológica: `an-hist-sem-contagem` é de março e
    // vem primeiro; `an-hist-zero` é de janeiro e vem depois. Qualquer `.sort()` por data na tela
    // inverteria os dois e este caso morreria.
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();

    const ids = await page.locator("li a[href^='/analyses/an-hist-']").evaluateAll((as) =>
      as.map((a) => (a.getAttribute("href") ?? "").replace("/analyses/", "")),
    );
    expect(ids, "a tela reordenou o que o backend entregou").toEqual(["an-hist-sem-contagem", "an-hist-zero"]);
  });

  test("vazio é vazio — não erro, não zero fabricado", async ({ page }) => {
    await semear(page, { "": { items: [], next_cursor: null } });
    await page.goto("/analyses");
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.locator("li a[href^='/analyses/an-']")).toHaveCount(0);
  });

  test("deep link e refresh entram direto na rota canônica", async ({ page }) => {
    await semear(page, UMA_PAGINA);
    await page.goto("/analyses");
    await expect(linha(page, "an-hist-zero")).toBeVisible();
    await page.reload();
    await expect(linha(page, "an-hist-zero")).toBeVisible();
    await expect(page).toHaveURL(/\/analyses$/);
  });
});
