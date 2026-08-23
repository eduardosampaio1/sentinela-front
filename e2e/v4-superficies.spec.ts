// As rotas que o Molde NAO desenhou, capturadas.
//
// Home e Instancias nao tem V4 para copiar — o molde diz *"O Molde desenhou apenas a analise"*.
// O que elas ganharam foi a MOLDURA (`.painel`), pelo escopo `.v4-superficie`.
//
// A captura existe pela mesma razao das outras: uma mudanca de desenho que ninguem olha e uma
// mudanca que ninguem verificou. E ela afirma ANTES de disparar, como as irmas.
import { expect, test, type Page } from "@playwright/test";

const SAIDA = new URL("../docs/v4/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function entrar(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

for (const [nome, rota, ancora] of [
  ["home", "/home", /Home/i],
  ["instancias", "/instances", /Instances/i],
] as const) {
  test(`superficie-${nome} @ desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1600 });
    await entrar(page);
    await page.goto(rota);
    const main = page.locator("main");
    await expect(main.getByText(ancora).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `${SAIDA}/superficie-${nome}.png`, fullPage: true });
  });
}
