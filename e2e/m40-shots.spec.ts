// M40 · INST-05 — as capturas. Elas existem para serem OLHADAS, não para passar.
//
// Cada estado que a seção pode assumir, nas larguras em que ela precisa caber, nos dois idiomas.
// A crítica de design se faz sobre isto — ler o JSX diz o que eu quis; a captura diz o que saiu.

import { expect, test, type Page } from "@playwright/test";

const INSTANCIA = "inst-e2e-0000-4000-8000-000000000001";
const A = "an-cand-e2e-0001";

async function semear(
  page: Page,
  opts: { baseline?: string | null; semCandidatos?: boolean; idioma?: "pt" | "en" } = {},
) {
  await page.addInitScript(
    ([baseline, sem, idioma]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (baseline) {
        sessionStorage.setItem(
          "__sentinela_baseline__",
          JSON.stringify({ id: baseline, setAt: "2026-08-06T13:22:00Z" }),
        );
      }
      if (sem) sessionStorage.setItem("__sentinela_baseline_sem_candidatos__", "1");
      if (idioma) localStorage.setItem("sentinela.language", idioma);
    },
    [opts.baseline ?? null, opts.semCandidatos ? "1" : "", opts.idioma ?? ""] as const,
  );
}

const secao = (page: Page) =>
  page.getByRole("region", { name: /Análise de referência|Reference analysis/ });

async function capturar(page: Page, info: { outputPath: (n: string) => string }, nome: string) {
  await expect(secao(page)).toBeVisible();
  await page.screenshot({ path: `docs/inst05/${nome}.png`, fullPage: true });
}

const ESTADOS = [
  { nome: "sem-referencia", opts: {} },
  { nome: "com-referencia", opts: { baseline: A } },
  { nome: "sem-candidatos", opts: { semCandidatos: true } },
] as const;

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 900 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

for (const vp of VIEWPORTS) {
  for (const e of ESTADOS) {
    test(`shot ${vp.nome} · ${e.nome}`, async ({ page }, info) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await semear(page, e.opts);
      await page.goto(`/instances/${INSTANCIA}`);
      await capturar(page, info, `${vp.nome}-${e.nome}`);
    });
  }
}

test("shot desktop · EN com referência", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await semear(page, { baseline: A, idioma: "en" });
  await page.goto(`/instances/${INSTANCIA}`);
  await capturar(page, info, "desktop-en-com-referencia");
});

test("shot desktop · EN sem referência", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await semear(page, { idioma: "en" });
  await page.goto(`/instances/${INSTANCIA}`);
  await capturar(page, info, "desktop-en-sem-referencia");
});

test("shot mobile · troca em voo", async ({ page }, info) => {
  // O estado transitório: o botão em `aria-busy` enquanto o POST viaja. Sem captura, "reflete
  // atividade" é afirmação sobre código.
  await page.setViewportSize({ width: 375, height: 812 });
  await semear(page, { baseline: A });
  await page.route("**/v1/instances/*/baseline", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(secao(page)).toBeVisible();
  await secao(page).getByRole("button", { name: /an-cand-e2e-0003/ }).click();
  await page.screenshot({ path: "docs/inst05/mobile-troca-em-voo.png", fullPage: true });
});
