import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test, type Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const MASSA = JSON.parse(readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/v3-comparacao.json"), "utf-8"));
const SAIDA = resolve(AQUI, "../docs/two-view");
const A = "an-cmp-a", B = "an-cmp-b";

async function semear(page: Page, quebra: boolean, semV3 = false) {
  await page.addInitScript(([a, b, dA, dB, faltando]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem("__sentinela_journey__", JSON.stringify({
      [a as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
      [b as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
    }));
    const docs: Record<string, unknown> = { [a as string]: dA };
    if (!faltando) docs[b as string] = dB;
    sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify(docs));
  }, [A, B, MASSA.A, quebra ? MASSA.B_QUEBRA : MASSA.B, semV3] as const);
}

const TELAS = [
  ["m39-comparacao", false, false],
  ["m39-quebra-documental", true, false],
  ["m39-sem-v3", false, true],
] as const;

for (const [nome, quebra, semV3] of TELAS) {
  for (const [vp, w, h] of [["desktop", 1280, 800], ["tablet", 768, 1024], ["mobile", 375, 812]] as const) {
    test(`${nome} @ ${vp}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await semear(page, quebra, semV3);
      await page.goto(`/analyses/compare/${A}/${B}`);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SAIDA}/${nome}-${vp}.png`, fullPage: true });
    });
  }
}
test("selecao na lista @ desktop", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true; });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/analyses");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SAIDA}/m39-selecao-desktop.png`, fullPage: true });
});
test("selecao na lista @ mobile", async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true; });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/analyses");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SAIDA}/m39-selecao-mobile.png`, fullPage: true });
});
