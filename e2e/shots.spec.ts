// As capturas das duas visões — ARGOS e Analytics.
//
// ## M45.4 · este arquivo não tinha UMA asserção
//
// Ele disparava `page.screenshot` depois de `waitForTimeout(700)` e pronto. Um arquivo de teste
// sem asserção **não pode falhar**: as 18 imagens saíam verdes por construção, e nada verificava
// que mostravam qualquer coisa. É a mesma dívida que a M42 pagou com uma captura de esqueleto
// cinza e que a M44 fechou com um provador — só que aqui não era um desvio, era o arquivo inteiro.
//
// Agora toda imagem afirma, ANTES de disparar, (1) uma âncora positiva do estado terminal que o
// NOME do arquivo promete e (2) uma segunda frase que só existe em inglês, que é o locale desta
// montagem. Duas âncoras, e não uma: a segunda é o que impede a primeira de passar por um
// fragmento que sobreviveria a meia tela.
//
// A regressão que isto pegou na primeira execução está registrada em `CompareAnalysesPage`.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ART = resolve(AQUI, "../../sentinela-facts/docs/contracts/e2e/analysis-result-v3.real.json");
const DOC = () => JSON.parse(readFileSync(ART, "utf-8")).resposta.result;
const SAIDA = resolve(AQUI, "../docs/two-view");

const SNAP = {
  snapshot_contract_version: "analytics-snapshot-v9",
  record_count: 100,
  numeric: [{ measure_id: "conversation_cost", unit: "USD", semantic_role: "sum", valid_count: 90, null_count: 10, invalid_count: 0, absent_count: 0, minimum: 0.1, maximum: 9.9, total: 100, mean: 1.1, suppression_applied: true, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d" }],
  distributions: [{ measure_id: "canal", value_type: "string", min_group_size: 5, value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, distinct_observed: 3, groups: [{ label: "web", count: 60 }, { label: "app", count: 30 }], other_count: null, suppression_applied: false, high_cardinality_suppressed: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", top_k: 10, max_tracked_categories: 50 }],
  dimensions: [{ measure_id: "regiao", value_type: "string", min_group_size: 5, value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, distinct_observed: 2, groups: [{ label: "sudeste", count: 70 }], other_count: 12, suppression_applied: false, high_cardinality_suppressed: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", top_k: 10, max_tracked_categories: 50 }],
  concentrations: [{ measure_id: "custo", unit: "USD", semantic_role: "sum", value_count: 100, null_count: 0, invalid_count: 0, absent_count: 0, total_volume: 100, bands: [], coarsening_applied: false, suppression_applied: false, high_cardinality_suppressed: false, statistics: [{ statistic_id: "top_10_share", state: "published", calculation_precision: "exact", value: 0.42, lower_bound: null, upper_bound: null, reason_code: null }, { statistic_id: "gini", state: "not_published", calculation_precision: null, value: null, lower_bound: null, upper_bound: null, reason_code: "below_min_group" }], method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", min_group_size: 5, max_tracked_values: 100 }],
  time_series: [{ dimension_id: "dia", effective_granularity: "day", timezone: "UTC", coarsening_applied: false, value_count: 3, null_count: 0, invalid_count: 0, windows: [{ window_start: "2026-08-01", count: 7, status: "published" }, { window_start: "2026-08-02", count: null, status: "suppressed" }, { window_start: "2026-08-03", count: 12, status: "published" }], temporal_series_suppressed: false, suppression_applied: false, method_id: "m", method_version: 1, method_parameters: {}, method_definition_digest: "d", privacy_policy_version: "p1", min_group_size: 5, max_time_buckets: 100, series_contract_version: "s1" }],
};

function vistaAnalytics(id: string, status = "ready") {
  return { analysis_id: id, component_status: status, snapshot_contract_version: "analytics-snapshot-v9", snapshot_digest: "sd", snapshot: status === "withheld" ? null : SNAP, disclosure_rule_version: "dr-1", projection_digest: "pd", withheld: null, generated_at: "2026-08-01T00:00:00Z" };
}

async function semear(page: Page, id: string, v3: unknown | null, anl: unknown | null = null) {
  await page.addInitScript(([i, d, a]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem("__sentinela_journey__", JSON.stringify({ [i as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }));
    if (d !== null) sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify({ [i as string]: d }));
    if (a !== null) sessionStorage.setItem("__sentinela_analytics__", JSON.stringify({ [i as string]: a }));
  }, [id, v3, anl] as const);
}

/**
 * Captura DEPOIS de provar o estado terminal e o idioma, pelo conteúdo renderizado.
 *
 * As duas âncoras são case-insensitive de propósito: várias destas seções têm
 * `text-transform: uppercase`, e uma regex sensível a caixa reprovaria a tela por causa do CSS —
 * erro que já custou uma tentativa na medição de idioma da M45.4.
 */
async function capturar(page: Page, nome: string, ancora: RegExp, marca: RegExp) {
  const main = page.locator("main");
  await expect(
    main.getByText(ancora).first(),
    `${nome}: o estado que o nome promete não apareceu antes do disparo`,
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    main.getByText(marca).first(),
    `${nome}: a captura diz ser inglês — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true });
}

/** Cada tela com a âncora do SEU estado. Duas telas que compartilhassem âncora não se distinguem. */
const TELAS = [
  ["argos-populado", "/analyses/an-v3/argos", true, null, /Health dimensions/i, /ARGOS catalog/i],
  ["argos-sem-documento", "/analyses/an-sem/argos", false, null, /This analysis has no ARGOS document/i, /historical result is still available/i],
  // `ready` e `partial` renderizam as MESMAS seções: só a frase de estado os separa, e é por ela
  // que cada um ancora. Ancorar em "Numeric measures" faria as duas capturas provarem a mesma coisa.
  ["analytics", "/analyses/an-v3/analytics", true, "ready", /^Delivered\.$/, /Numeric measures/i],
  ["analytics-parcial", "/analyses/an-p/analytics", true, "partial", /Delivered in part/i, /Numeric measures/i],
  ["analytics-retido", "/analyses/an-w/analytics", true, "withheld", /Analytics results were not released/i, /privacy decision, not a failure/i],
  ["jornada-duas-visoes", "/analyses/an-v3", true, null, /Analysis completed/i, /Completed/],
] as const;

for (const [nome, rota, comDoc, anl, ancora, marca] of TELAS) {
  for (const [vp, w, h] of [["desktop", 1280, 800], ["tablet", 768, 1024], ["mobile", 375, 812]] as const) {
    test(`${nome} @ ${vp}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      const id = rota.split("/")[2];
      await semear(page, id, comDoc ? DOC() : null, anl ? vistaAnalytics(id, anl) : null);
      await page.goto(rota);
      await capturar(page, `${nome}-${vp}`, ancora, marca);
    });
  }
}
