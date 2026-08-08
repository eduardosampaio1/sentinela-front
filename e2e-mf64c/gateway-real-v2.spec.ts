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
 * Abre o resultado e devolve quantas respostas vieram DA ORIGEM DO GATEWAY.
 *
 * A contagem é a prova de que o MSW não respondeu no lugar dele. Sem ela, uma spec verde seria
 * compatível com "o worker interceptou e devolveu a massa antiga" — que é o falso verde que esta
 * fatia inteira existe para não ter.
 */
async function abrir(page: Page, id: string): Promise<{ doGateway: number }> {
  let doGateway = 0;
  page.on("response", (r) => {
    if (new URL(r.url()).origin === ORIGEM_DO_GATEWAY) doGateway += 1;
  });
  await autenticar(page);
  await page.goto(`/canonical/analyses/${id}/result`);
  await expect(page.getByTestId("canonical-result-page")).toBeVisible();
  return { doGateway };
}

/** O documento como o GATEWAY o entrega — a referência contra a qual a tela é conferida. */
async function documentoDoGateway(id: string): Promise<Record<string, unknown>> {
  const r = await fetch(
    `${CORREDOR.gateway}/v1/analyses/${id}/result?workspace_id=${CORREDOR.workspace}`,
    { headers: { Authorization: "Bearer e2e-local-session-not-a-real-credential" } },
  );
  expect(r.status).toBe(200);
  return (await r.json()) as Record<string, unknown>;
}

test.describe("MF6.4c — Gateway real → Frontend → tela", () => {
  test("ready: Engine e Analytics renderizados com os números que o Gateway entregou", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    const { doGateway } = await abrir(page, id);

    // ── a composição aconteceu de verdade ────────────────────────────────────
    expect(doGateway, "nenhuma resposta veio da origem do Gateway").toBeGreaterThan(0);
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
    await expect(page.getByRole("heading", { name: "Over time" })).toBeVisible();
  });

  test("declared_turns e Pareto vêm do documento, não de conta no cliente", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const dados = (publico.result as Record<string, any>).analytics.data;
    const concentracao = dados.concentrations.find((c: any) => c.measure_id === "declared_turns");
    expect(concentracao, "o documento do Gateway não trouxe declared_turns").toBeTruthy();

    const area = page.getByRole("heading", { name: "Volume concentration" }).locator("xpath=..");
    await expect(area).toContainText("Declared turns");

    // A participação exibida é a do documento, na escala percentual que a origem declara —
    // 0,6233766… → "62.3%". Nenhuma outra conta produz esse número a partir do que está na tela.
    const top = concentracao.statistics.find(
      (e: any) => e.statistic_id === "top_20_percent_volume_share",
    );
    expect(top.state).toBe("published");
    await expect(area).toContainText(`${(top.value * 100).toFixed(1)}%`);

    // As faixas: a contagem de entidades aparece ESCRITA, não só como comprimento de barra.
    for (const faixa of concentracao.bands) {
      await expect(area).toContainText(String(faixa.entity_count));
    }
  });

  test("temporal: as janelas do documento aparecem rotuladas pela granularidade dele", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const serie = (publico.result as Record<string, any>).analytics.data.time_series[0];
    expect(serie.effective_granularity).toBe("month");

    const area = page.getByRole("heading", { name: "Over time" }).locator("xpath=..");
    await expect(area).toContainText("month");
    for (const janela of serie.windows) {
      await expect(area).toContainText(String(janela.count));
    }
  });

  test("nenhuma métrica é recalculada no cliente", async ({ page }) => {
    const id = CORREDOR.ids.ready;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const dimensao = (publico.result as Record<string, any>).analytics.data.dimensions[0];

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
    expect((publico.result as Record<string, any>).analytics.component_status).toBe("partial");

    const aviso = page.getByText(/omitted to avoid revealing small groups/);
    await expect(aviso).toBeVisible();
    await expect(aviso).toHaveAttribute("role", "status");
    await expect(page.getByRole("heading", { name: "Measures" })).toBeVisible();
  });

  test("withheld: conclusão de privacidade — sem erro, sem retry, Engine intacta", async ({ page }) => {
    const id = CORREDOR.ids.retido;
    await abrir(page, id);
    const publico = await documentoDoGateway(id);
    const analytics = (publico.result as Record<string, any>).analytics;
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
