// MF6.4c — o browser atravessa até o Gateway REAL e renderiza o `analysis-result-v2`.
//
//     browser → Frontend (dev server) → Gateway real → Orchestrator real → Postgres
//
// A diferença para `e2e/canonical-result.spec.ts` é a única que importa aqui: lá o documento é
// semeado no MSW e a prova é da renderização; aqui o documento vem de um Result Store real, por
// dois sockets, e a prova é da COMPOSIÇÃO inteira.
//
// Os `analysis_id` NÃO são inventados por esta spec: eles vêm de `corredor.json`, escrito por
// quem os semeou no Postgres. Uma spec que os fabricasse estaria adivinhando o estado do banco.

import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CORREDOR = JSON.parse(
  readFileSync(join(tmpdir(), "gate-mf64c", "corredor.json"), "utf-8"),
) as { gateway: string; ids: Record<string, string>; workspace: string };

const ORIGEM_DO_GATEWAY = new URL(CORREDOR.gateway).origin;

/** Liga o bypass de auth E2E. O token/workspace que ele injeta são os que o Gateway espera. */
async function autenticar(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

/**
 * Abre o resultado e ESPERA a resposta do documento vinda da origem do Gateway.
 *
 * Esperar, e não contar depois. A primeira versão somava respostas num contador e lia o número
 * assim que a página aparecia — mas `canonical-result-page` fica visível no estado de
 * carregamento, antes de a requisição terminar. A asserção passava quando a rede era rápida e
 * falhava quando não era: uma prova de "o Gateway respondeu" que dependia de sorte é pior que
 * nenhuma, porque um dia ela fica verde pelo motivo errado.
 *
 * O `waitForResponse` prova as duas coisas de uma vez: houve requisição PARA A ORIGEM DO
 * GATEWAY, e ela foi respondida. Se o MSW tivesse interceptado, nada apareceria naquela origem.
 */
async function abrir(page: Page, id: string): Promise<void> {
  await autenticar(page);
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).origin === ORIGEM_DO_GATEWAY &&
        r.url().includes(`/v1/analyses/${id}/result`),
    ),
    page.goto(`/canonical/analyses/${id}/result`),
  ]);
  expect(resposta.status(), "o Gateway não respondeu 200 ao documento").toBe(200);
  await expect(page.getByTestId("canonical-result-page")).toBeVisible();
}

/**
 * O RECORTE do documento que esta spec lê. Declarado, e não `any`.
 *
 * Não é o contrato inteiro — é o que a spec confere. Escrever `any` aqui pareceria inofensivo e
 * custaria a única coisa que o tipo dá de graça neste arquivo: se o Gateway parar de entregar
 * `analytics.data.concentrations`, o erro aparece na compilação em vez de virar `undefined` no
 * meio de uma asserção.
 */
interface GrupoDoDocumento {
  label: string;
  count: number;
}
interface DistribuicaoDoDocumento {
  measure_id: string;
  value_count: number;
  groups: GrupoDoDocumento[];
}
interface EstatisticaDoDocumento {
  statistic_id: string;
  state: string;
  value: number | null;
}
interface ConcentracaoDoDocumento {
  measure_id: string;
  statistics: EstatisticaDoDocumento[];
  bands: { entity_count: number }[];
}
interface SerieDoDocumento {
  effective_granularity: string;
  windows: { count: number | null }[];
}
interface SnapshotDoDocumento {
  dimensions: DistribuicaoDoDocumento[];
  concentrations: ConcentracaoDoDocumento[];
  time_series: SerieDoDocumento[];
}
interface DocumentoPublico {
  result_schema_version: string;
  indicator_registry_version: string;
  /** `analytics` só existe no v2 — o v1 não tem um, e inventá-lo aqui esconderia a diferença. */
  result: { analytics?: { component_status: string; data: SnapshotDoDocumento | null } };
}

/** O documento como o GATEWAY o entrega — a referência contra a qual a tela é conferida. */
async function documentoDoGateway(id: string): Promise<DocumentoPublico> {
  const r = await fetch(
    `${CORREDOR.gateway}/v1/analyses/${id}/result?workspace_id=${CORREDOR.workspace}`,
    { headers: { Authorization: "Bearer e2e-local-session-not-a-real-credential" } },
  );
  expect(r.status).toBe(200);
  return (await r.json()) as DocumentoPublico;
}

/** O bloco analítico, ou uma falha explícita — nunca um `?.` que engole o estado errado. */
function analiticoDe(publico: DocumentoPublico): { component_status: string; data: SnapshotDoDocumento | null } {
  const bloco = publico.result.analytics;
  if (!bloco) throw new Error("o documento do Gateway não trouxe o bloco `analytics`");
  return bloco;
}

/** O snapshot, exigindo que ele exista (ready/partial). */
function snapshotDe(publico: DocumentoPublico): SnapshotDoDocumento {
  const dados = analiticoDe(publico).data;
  if (!dados) throw new Error("o documento do Gateway veio sem conteúdo analítico");
  return dados;
}

test.describe("MF6.4c — Gateway real → Frontend → tela", () => {
  test("ready: Engine e Analytics renderizados com os números que o Gateway entregou", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id); // já prova que o documento veio da origem do Gateway
    const publico = await documentoDoGateway(id);
    expect(publico.result_schema_version).toBe("analysis-result-v2");

    // ── resumo da Engine ─────────────────────────────────────────────────────
    const registros = page.getByText("Records analyzed");
    await expect(registros).toBeVisible();
    await expect(registros.locator("xpath=..")).toContainText("100");
    await expect(page.getByRole("heading", { name: "Indicators" })).toBeVisible();

    // ── bloco analítico ──────────────────────────────────────────────────────
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    const denominador = page.getByText("Conversations in the projection");
    await expect(denominador).toBeVisible();
    await expect(denominador.locator("xpath=..")).toContainText("100");

    // ── as áreas ─────────────────────────────────────────────────────────────
    await expect(page.getByRole("heading", { name: "Measures" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dimensions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Volume concentration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Time series" })).toBeVisible();
  });

  test("declared_turns e Pareto vêm do documento, não de conta no cliente", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const dados = snapshotDe(publico);
    const concentracao = dados.concentrations.find((c) => c.measure_id === "declared_turns");
    expect(concentracao, "o documento do Gateway não trouxe declared_turns").toBeTruthy();

    const area = page.getByRole("heading", { name: "Volume concentration" }).locator("xpath=..");
    await expect(area).toContainText("Declared turns");

    // A participação exibida é a do documento, na escala percentual que a origem declara —
    // 0,6233766… → "62.3%". Nenhuma outra conta produz esse número a partir do que está na tela.
    const top = concentracao!.statistics.find(
      (e) => e.statistic_id === "top_20_percent_volume_share",
    );
    expect(top?.state).toBe("published");
    await expect(area).toContainText(`${((top!.value ?? 0) * 100).toFixed(1)}%`);

    // As faixas: a contagem de entidades aparece ESCRITA, não só como comprimento de barra.
    for (const faixa of concentracao!.bands) {
      await expect(area).toContainText(String(faixa.entity_count));
    }
  });

  test("temporal: as janelas do documento aparecem rotuladas pela granularidade dele", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const serie = snapshotDe(publico).time_series[0];
    expect(serie.effective_granularity).toBe("month");

    const area = page.getByRole("heading", { name: "Time series" }).locator("xpath=..");
    await expect(area).toContainText("month");
    for (const janela of serie.windows) {
      await expect(area).toContainText(String(janela.count));
    }
  });

  test("nenhuma métrica é recalculada no cliente", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const dimensao = snapshotDe(publico).dimensions[0];

    const area = page.getByRole("heading", { name: "Dimensions" }).locator("xpath=..");
    const texto = (await area.textContent()) ?? "";

    for (const grupo of dimensao.groups) {
      expect(texto, `o grupo ${grupo.label} não apareceu`).toContain(grupo.label);
      expect(texto).toContain(String(grupo.count));
      // `count / value_count` daria um percentual que o backend NÃO publicou. Se ele
      // aparecesse, seria com esta cara.
      const inventado = `${Math.round((grupo.count / dimensao.value_count) * 100)}%`;
      expect(texto, `percentual inventado na tela: ${inventado}`).not.toContain(inventado);
    }
    // A cobertura das medidas também não é fabricada: as contagens saem como contagens.
    const medidas = page.getByRole("heading", { name: "Measures" }).locator("xpath=..");
    await expect(medidas).toContainText("With value");
  });

  test("partial: a tela diz que entregou menos, e mostra o que sobrou", async ({ page }) => {
    const id = CORREDOR.ids.parcial;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    expect(analiticoDe(publico).component_status).toBe("partial");

    const aviso = page.getByText(/omitted to avoid revealing small groups/);
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveAttribute("role", "status");
    await expect(page.getByRole("heading", { name: "Measures" })).toBeVisible();
  });

  test("withheld: conclusão de privacidade — sem erro, sem retry, Engine intacta", async ({ page }) => {
    const id = CORREDOR.ids.retido;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const analytics = analiticoDe(publico);
    expect(analytics.component_status).toBe("withheld");
    expect(analytics.data).toBeNull();

    const bloco = page.getByText("Analytics results were not released");
    await expect(bloco).toBeVisible();
    // Nem `alert`, nem botão de tentar de novo: não há o que tentar.
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(bloco.locator("xpath=..").getByRole("button")).toHaveCount(0);
    // E as áreas analíticas não aparecem — não há conteúdo para elas.
    await expect(page.getByRole("heading", { name: "Measures" })).toHaveCount(0);
    // A Engine continua inteira.
    await expect(page.getByRole("heading", { name: "Indicators" })).toBeVisible();
  });

  test("export existe onde há documento — inclusive em withheld", async ({ page }) => {
    // Em `withheld` o arquivo tem o que dizer: o estado do componente. Esconder o botão faria a
    // pessoa concluir que não há resultado nenhum a levar embora.
    for (const id of [CORREDOR.ids.ready, CORREDOR.ids.retido]) {
      await abrir(page, id);
      await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    }
  });

  test("v1 histórico: a MESMA tela, sem bloco analítico", async ({ page }) => {
    const id = CORREDOR.ids.so_v1;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    expect(publico.result_schema_version).toBe("analysis-result-v1");

    await expect(page.getByText("Records analyzed")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Indicators" })).toBeVisible();
    // Nenhum bloco analítico inventado: o v1 não tem um, e mostrá-lo vazio afirmaria ausência.
    await expect(page.getByRole("heading", { name: "Analytics" })).toHaveCount(0);
  });
});
