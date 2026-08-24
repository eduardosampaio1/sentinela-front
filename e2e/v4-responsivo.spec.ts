// As superfícies V4 não rolam na horizontal — desktop, tablet e telefone.
//
// ## Por que este arquivo existe
//
// O porte da V4 trouxe o desenho do Molde, que era de desktop, e trouxe a geometria dele inteira:
// `.hero` com 352px + 372px de colunas FIXAS, `.kpis` com seis colunas, `.trio` com três. O
// `globals.css` ficou com **cinco** `@media` no total, e **quatro** eram de `.v4-medidas`.
//
// `v4-diagnostico.spec.ts` já capturava em tablet e telefone — e nunca afirmou nada sobre
// largura. As imagens saíam e ninguém as media. Este arquivo é a asserção que faltava.
//
// ## A régua é o `main`, e é aí que o gate irmão é CEGO
//
// `PageFrame` renderiza `<main class="flex-1 overflow-y-auto">`: quem rola é o `main`, e o
// documento tem sempre a altura e a largura da janela. Medido no estado quebrado:
//
//     Diagnóstico @ 375px  ->  excessoDocumento = 0   ·   excessoMain = 493
//
// Um gate que olhe `document.scrollingElement` — como `canonical-responsive.spec.ts` fazia —
// passa verde sobre 493px de transbordo real. É a mesma armadilha que já custou uma captura
// `fullPage` cortada nesta casca.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

import { vistaAnalytics } from "../src/test/fixtures/canonical-result/analyticsSnapshot";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DOC = () =>
  JSON.parse(
    readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/argos-v3-homol.json"), "utf-8"),
  );

const VIEWPORTS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

async function semear(page: Page, id: string, v3: unknown, anl: unknown = null) {
  await page.addInitScript(([i, d, a]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem(
      "__sentinela_journey__",
      JSON.stringify({ [i as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
    );
    sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify({ [i as string]: d }));
    if (a !== null) sessionStorage.setItem("__sentinela_analytics__", JSON.stringify({ [i as string]: a }));
  }, [id, v3, anl] as const);
}

/** O excesso horizontal do `main`, mais quem o causa — para o erro dizer ONDE. */
async function transbordo(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) throw new Error("sem <main>: a régua deste gate não existe nesta página");
    const caixa = main.getBoundingClientRect();
    const rotulo = (el: Element) => {
      const cls =
        typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
      return el.tagName.toLowerCase() + (cls ? "." + cls : "");
    };
    const culpados: string[] = [];
    main.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      const excede = Math.round(r.right - caixa.right);
      if (excede > 4) culpados.push(`${rotulo(el)} (+${excede}px)`);
    });
    return {
      excesso: main.scrollWidth - main.clientWidth,
      culpados: [...new Set(culpados)].slice(0, 6),
    };
  });
}

async function semRolagemHorizontal(page: Page, onde: string) {
  const { excesso, culpados } = await transbordo(page);
  expect(excesso, `${onde}: ${excesso}px de rolagem horizontal — ${culpados.join(", ")}`).toBeLessThanOrEqual(1);
}

for (const vp of VIEWPORTS) {
  test(`V4 Diagnóstico sem rolagem horizontal @ ${vp.nome} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await semear(page, "an-v4", DOC());
    await page.goto("/analyses/an-v4/argos");

    // Âncora de conteúdo: sem ela o gate mediria uma tela que não terminou de montar, e
    // "não transborda" sobre o vazio é verde pelo motivo errado.
    await expect(page.locator("main").getByText(/ARGOS catalog/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await semRolagemHorizontal(page, `Diagnóstico @ ${vp.nome}`);
  });

  test(`V4 Medidas sem rolagem horizontal @ ${vp.nome} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await semear(page, "an-v4", DOC(), vistaAnalytics("an-v4"));
    await page.goto("/analyses/an-v4/analytics");

    await expect(page.locator("main").getByText(/Numeric measures/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await semRolagemHorizontal(page, `Medidas @ ${vp.nome}`);
  });
}

test("a lateral RECOLHE no telefone, e o conteúdo recebe a largura toda", async ({ page }) => {
  // O defeito que este caso trava foi regressão do próprio porte da V4.
  //
  // `Sidebar.tsx` declara `hidden md:flex`. A folha V4 escrevia `.v4-lateral { display:flex }`, e
  // como esse bloco mora DEPOIS de `@tailwind utilities` (o `@layer` era podado), ele vencia o
  // `.hidden` por ordem de cascata. A 375px a lateral ficava com 232px e sobravam 143px para o
  // conteúdo — o `hidden` continuava no HTML e não valia nada.
  await page.setViewportSize({ width: 375, height: 812 });
  await semear(page, "an-v4", DOC());
  await page.goto("/analyses/an-v4/argos");
  await expect(page.locator("main").getByText(/ARGOS catalog/i).first()).toBeVisible({
    timeout: 15_000,
  });

  const medidas = await page.evaluate(() => {
    const lateral = document.querySelector(".v4-lateral");
    const main = document.querySelector("main");
    return {
      lateralLargura: lateral ? Math.round(lateral.getBoundingClientRect().width) : null,
      mainLargura: main ? Math.round(main.getBoundingClientRect().width) : null,
      viewport: document.documentElement.clientWidth,
    };
  });

  expect(medidas.lateralLargura, "a lateral não pode ocupar espaço no telefone").toBe(0);
  expect(
    medidas.mainLargura,
    "o conteúdo tem de receber praticamente a viewport inteira",
  ).toBeGreaterThan(medidas.viewport - 8);
});

test("no DESKTOP a lateral continua aberta — o conserto não pode virar 'esconder sempre'", async ({
  page,
}) => {
  // A contraparte do caso acima. Sem ela, `display:none` incondicional passaria nos dois.
  await page.setViewportSize({ width: 1440, height: 900 });
  await semear(page, "an-v4", DOC());
  await page.goto("/analyses/an-v4/argos");
  await expect(page.locator("main").getByText(/ARGOS catalog/i).first()).toBeVisible({
    timeout: 15_000,
  });

  const lateral = await page.evaluate(() => {
    const el = document.querySelector(".v4-lateral");
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  });

  expect(lateral, "no desktop a lateral tem de estar visível").toBeGreaterThan(100);
});
