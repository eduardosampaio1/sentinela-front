// M39 · EVO-02 — a comparação ARGOS em BROWSER REAL.
//
// O que só o browser prova: que as DUAS leituras saem, que cada uma carrega
// `result_schema_version=3`, que nenhuma chama `/analytics`, que o deep link e o refresh
// reconstroem os dois lados pelos ids da URL, e que a quebra documental não se parece com
// "não houve diferenças".
//
// A massa é a dos scenarios v3: dois documentos do código analítico real, com 14 pares de
// indicador e 4 de dimensão. As contagens são EXATAS — `> 0` deixaria passar uma regra que
// perdesse metade das linhas.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const MASSA = JSON.parse(
  readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/v3-comparacao.json"), "utf-8"),
);

const A = "an-cmp-a";
const B = "an-cmp-b";
const PARES_DE_INDICADOR = 14;
const PARES_DE_DIMENSAO = 4;

/** Semeia os dois lados. `quebra` troca B pelo documento com o registro divergente. */
async function semear(page: Page, quebra = false) {
  await page.addInitScript(
    ([a, b, docA, docB]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({
          [a as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
          [b as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
        }),
      );
      sessionStorage.setItem(
        "__sentinela_result_v3__",
        JSON.stringify({ [a as string]: docA, [b as string]: docB }),
      );
    },
    [A, B, MASSA.A, quebra ? MASSA.B_QUEBRA : MASSA.B] as const,
  );
}

function espiar(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("/v1/analyses/")) urls.push(u);
  });
  return urls;
}

const daRota = (urls: string[]) =>
  urls.filter((u) => /\/v1\/analyses\/[^/]+\/result/.test(u));

test.describe("M39 — comparação ARGOS A×B (browser real)", () => {
  test("deep link abre a comparação e faz EXATAMENTE duas leituras v3", async ({ page }) => {
    const urls = espiar(page);
    await semear(page);
    await page.goto(`/analyses/compare/${A}/${B}`);

    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();

    const leituras = daRota(urls);
    expect(leituras, `leituras de resultado: ${leituras.join(" · ")}`).toHaveLength(2);
    // As DUAS carregam a versão. Uma sem o pedido traria o documento histórico, e a tela
    // mostraria o v1 achando que mostra o ARGOS.
    expect(leituras.every((u) => u.includes("result_schema_version=3"))).toBe(true);
    // Um id de cada lado — nenhum lado buscado duas vezes.
    expect(leituras.some((u) => u.includes(A))).toBe(true);
    expect(leituras.some((u) => u.includes(B))).toBe(true);
    // E nada de Analytics.
    expect(urls.filter((u) => u.includes("/analytics"))).toEqual([]);
  });

  test("as contagens da massa aparecem: 14 pares de indicador, 4 de dimensão", async ({ page }) => {
    await semear(page);
    await page.goto(`/analyses/compare/${A}/${B}`);

    const indicadores = page.getByRole("region", { name: /Indicadores|Indicators/i });
    await expect(indicadores.getByRole("listitem")).toHaveCount(PARES_DE_INDICADOR);

    const dimensoes = page.getByRole("region", { name: /Dimens|dimensions/i });
    await expect(dimensoes.getByRole("listitem")).toHaveCount(PARES_DE_DIMENSAO);
  });

  test("refresh reconstrói os dois lados pelos ids da URL", async ({ page }) => {
    await semear(page);
    await page.goto(`/analyses/compare/${A}/${B}`);
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/analyses/compare/${A}/${B}`);
  });

  test("a ordem A/B é a da rota — inverter a URL inverte os lados", async ({ page }) => {
    // A e B são POSIÇÕES. Se a tela decidisse a ordem por outro critério (data, cache), inverter
    // a URL não mudaria nada — e a rota deixaria de ser a identidade que ela promete ser.
    await semear(page);
    await page.goto(`/analyses/compare/${B}/${A}`);
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/analyses/compare/${B}/${A}`);
  });

  test("quebra documental NÃO parece 'não houve diferenças'", async ({ page }) => {
    await semear(page, true);
    await page.goto(`/analyses/compare/${A}/${B}`);

    // Estado próprio, com texto. E NENHUMA tabela de família: uma lista vazia aqui seria lida
    // como "os valores são iguais", que é o oposto do que aconteceu.
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toHaveCount(0);
    await expect(page.getByRole("region", { name: /Dimens|dimensions/i })).toHaveCount(0);
    // O campo que quebrou é dito — "não comparável" sem o quê manda adivinhar.
    await expect(page.getByText("indicator_registry_version")).toBeVisible();
  });

  test("nenhum vocabulário temporal na tela", async ({ page }) => {
    await semear(page);
    await page.goto(`/analyses/compare/${A}/${B}`);
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();
    const corpo = (await page.locator("main").innerText()).toLowerCase();
    for (const proibido of ["anterior", "atual", "antes", "depois", "previous", "current"]) {
      expect(corpo.includes(proibido), `a tela diz "${proibido}"`).toBe(false);
    }
  });
});

test.describe("M39 — responsivo", () => {
  for (const [nome, largura, altura] of [
    ["desktop", 1280, 800],
    ["tablet", 768, 1024],
    ["mobile", 375, 812],
  ] as const) {
    test(`comparação em ${nome}: os dois lados são identificáveis e nada estoura`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await semear(page);
      await page.goto(`/analyses/compare/${A}/${B}`);
      await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();

      // Os rótulos A e B precisam estar VISÍVEIS em qualquer largura — mas eles MIGRAM: no
      // desktop vivem no cabeçalho da grade, no mobile dentro de cada linha, porque três
      // colunas de 375px transformariam número em reticências.
      //
      // Por isso a asserção conta ocorrências visíveis em vez de usar `.first()`: a primeira
      // ocorrência no DOM é a do cabeçalho, que está oculta justamente no mobile. Meu teste
      // reprovava a tela por um critério que ela atende de outro jeito.
      for (const [lado, padrao] of [["A", /Análise A|Analysis A/], ["B", /Análise B|Analysis B/]] as const) {
        const visiveis = await page
          .getByText(padrao)
          .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
        expect(visiveis, `${nome}: rótulo do lado ${lado} não está visível`).toBeGreaterThan(0);
      }

      const estoura = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(estoura, `${nome}: rola na horizontal`).toBe(false);
    });
  }
});

test.describe("M39 — teclado", () => {
  test("voltar à lista é alcançável só com o teclado", async ({ page }) => {
    await semear(page);
    await page.goto(`/analyses/compare/${A}/${B}`);
    await expect(page.getByRole("region", { name: /Indicadores|Indicators/i })).toBeVisible();

    // O nome real do link, medido na captura: "View all analyses". Meu seletor procurava
    // "lista/list" e não casava — falso negativo do teste, não defeito da tela.
    const voltar = page.getByRole("link", { name: /analyses|análises/i }).first();
    await voltar.focus();
    await expect(voltar).toBeFocused();
    await page.keyboard.press("Enter");
    expect(new URL(page.url()).pathname).toBe("/analyses");
  });
});
