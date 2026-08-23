// As capturas da CASCA V4 do Diagnóstico, sobre o documento REAL de homologação.
//
// ## Por que uma massa própria, e não a de `shots.spec.ts`
//
// `analysis-result-v3.real.json` é real e é POBRE: quatro dimensões e catorze indicadores, com
// `scores`, `intents`, `alerts` e `risks` todos nulos. Ela prova o caminho de um documento
// magro — e é por isso que continua existindo.
//
// Ela não serve para desenhar o painel. Metade do desenho da V4 (o herói, a régua dos cortes, a
// tabela de intenções, os alertas do motor) só aparece quando essas famílias existem, e sobre a
// massa magra o layout inteiro cai no ramo de ausência. Desenhar contra ela seria desenhar contra
// a tela vazia.
//
// Esta massa saiu de `orchestrator_argos_results` da análise que atravessou homologação em
// 2026-08-23: 7 escores (com `thresholds` 75/60 no `behavior_score`), 4 intenções, 18
// indicadores, 4 dimensões, 2 riscos, 1 alerta, 4 projeções e `partiality.complete = false`.
//
// **`evidence` e `recommendations` são nulos nela, e isso é dado, não falha.** A V4 desenha os
// dois no herói; a tela tem de dizer a ausência em vez de fingir conteúdo.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DOC = () =>
  JSON.parse(readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/argos-v3-homol.json"), "utf-8"));
const SAIDA = resolve(AQUI, "../docs/v4");

async function semear(page: Page, id: string, v3: unknown) {
  await page.addInitScript(([i, d]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem(
      "__sentinela_journey__",
      JSON.stringify({ [i as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
    );
    sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify({ [i as string]: d }));
  }, [id, v3] as const);
}

for (const [vp, w, h] of [["desktop", 1440, 900], ["tablet", 768, 1024], ["mobile", 375, 812]] as const) {
  test(`diagnostico-v4 @ ${vp}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await semear(page, "an-v4", DOC());
    await page.goto("/analyses/an-v4/argos");
    const main = page.locator("main");
    // Duas âncoras, como manda o irmão: o número que é a manchete, e uma frase que só existe
    // em inglês — a captura afirma o locale desta montagem.
    await expect(main.getByText(/89\.23|89,23/).first()).toBeVisible({ timeout: 15_000 });
    await expect(main.getByText(/ARGOS catalog/i).first()).toBeVisible();
    await page.screenshot({ path: `${SAIDA}/diagnostico-${vp}.png`, fullPage: true });
  });
}
