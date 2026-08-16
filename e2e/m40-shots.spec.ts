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
      // A CHAVE certa é `sentinela:language`, com dois-pontos. Com o ponto, nada era escrito e o
      // idioma ficava no padrão (`en`) — e as duas capturas que diziam "en" saíram byte-a-byte
      // IDÊNTICAS às que não diziam nada. Dois arquivos, dois nomes, uma prova só.
      if (idioma) localStorage.setItem("sentinela:language", idioma);
    },
    [opts.baseline ?? null, opts.semCandidatos ? "1" : "", opts.idioma ?? ""] as const,
  );
}

const secao = (page: Page) =>
  page.getByRole("region", { name: /Análise de referência|Reference analysis/ });

/**
 * Captura DEPOIS de provar o ESTADO e o IDIOMA.
 *
 * A âncora era a seção — visível nos três estados. `com-referencia` passaria renderizando
 * `sem-referencia`, e foi assim que duas capturas duplicadas conviveram sem ninguém notar.
 */
async function capturar(
  page: Page,
  nome: string,
  ancora: RegExp,
  idioma: "pt" | "en",
) {
  await expect(secao(page)).toBeVisible();
  await expect(
    secao(page).getByText(ancora).first(),
    `${nome}: o estado que o nome promete não apareceu antes do disparo`,
  ).toBeVisible({ timeout: 15_000 });
  const marca = idioma === "pt" ? /Análise de referência/ : /Reference analysis/;
  await expect(
    page.locator("main").getByText(marca).first(),
    `${nome}: a captura diz ser ${idioma} — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `docs/inst05/${nome}.png`, fullPage: true });
}

/** Cada estado com a âncora do SEU estado — a da seção é a mesma nos três. */
const ESTADOS = [
  { nome: "sem-referencia", opts: {}, ancora: /doesn.t have a reference analysis yet|ainda não tem uma análise de referência/ },
  { nome: "com-referencia", opts: { baseline: A }, ancora: /Current reference|Referência atual/ },
  { nome: "sem-candidatos", opts: { semCandidatos: true }, ancora: /No analysis can be the reference yet|Nenhuma análise pode ser referência/ },
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
      await capturar(page, `${vp.nome}-${e.nome}`, e.ancora, "en");
    });
  }
}

// O PAR DE IDIOMA — agora em PT, e o motivo é que ele existe para provar o OUTRO idioma.
//
// Ele nasceu declarando `en`, que é o PADRÃO da interface. Com a chave errada nada era escrito, e
// mesmo com a chave certa a captura sairia idêntica às demais: `en` sobre `en`. As duas imagens
// eram cópias byte-a-byte de `desktop-com-referencia` e `desktop-sem-referencia`.
//
// Em PT elas passam a mostrar o que a dupla sempre quis mostrar: a mesma tela, no idioma que NÃO é
// o padrão. Os arquivos foram renomeados junto — um nome que diz `en` sobre uma imagem em PT seria
// trocar um defeito por outro.
test("shot desktop · PT com referência", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await semear(page, { baseline: A, idioma: "pt" });
  await page.goto(`/instances/${INSTANCIA}`);
  await capturar(page, "desktop-pt-com-referencia", /Referência atual/, "pt");
});

test("shot desktop · PT sem referência", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await semear(page, { idioma: "pt" });
  await page.goto(`/instances/${INSTANCIA}`);
  await capturar(page, "desktop-pt-sem-referencia", /ainda não tem uma análise de referência/, "pt");
});

test("shot mobile · troca em voo", async ({ page }) => {
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
