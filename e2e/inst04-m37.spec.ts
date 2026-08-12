// M37 · INST-04 — prova VISUAL em browser real.
//
// O que o vitest cobre é a associação no transporte; o que esta spec cobre é o caminho humano:
// estar numa Instância, iniciar a análise dali, e chegar ao fluxo canônico com o contexto — nas
// três larguras, por teclado, sem violação de axe.
//
// A entrada é sempre pela URL da Instância. É de propósito: INST-04 promete nascer do endereço
// durável, e clicar a partir de uma lista já carregada provaria a navegação interna, que é
// justamente o caminho em que a perda de contexto não aparece.

import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

const INSTANCIA = "inst-e2e-0000-4000-8000-000000000001";
const CTA = /Iniciar análise|Start analysis/;

async function comAuth(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

/** Observa a requisição REAL do prepare — query e corpo, como saem do cliente. */
function observarPrepare(page: Page) {
  const capturado: { url: string; corpo: string | null }[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/v1\/analyses(\?|$)/.test(r.url())) {
      capturado.push({ url: r.url(), corpo: r.postData() });
    }
  });
  return capturado;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. O caminho humano, nas três larguras
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`INST-04 (${vp.nome}): a ação nasce na Instância e leva o contexto`, async ({ page }, info) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await comAuth(page);
    const pedidos = observarPrepare(page);

    await page.goto(`/instances/${INSTANCIA}`);
    await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();

    const botao = page.getByRole("button", { name: /Iniciar análise em|Start analysis in/ }).first();
    await expect(botao).toBeVisible();

    // Sem overflow horizontal: o CTA não pode empurrar a página para fora nas larguras estreitas.
    const excesso = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(excesso, "overflow horizontal com o CTA da INST-04").toBeLessThanOrEqual(1);

    await page.screenshot({ path: `test-results/m37-instancia-${vp.nome}.png`, fullPage: true });
    await info.attach(`m37-instancia-${vp.nome}`, {
      path: `test-results/m37-instancia-${vp.nome}.png`,
      contentType: "image/png",
    });

    await botao.click();
    // Chega à identidade durável da análise — o fluxo canônico, não uma segunda tela.
    await page.waitForURL(/\/analyses\/an-e2e/);

    expect(pedidos.length, "o prepare não saiu").toBe(1);
    const u = new URL(pedidos[0].url);
    expect(u.searchParams.get("instance_id"), "o contexto não viajou na query").toBe(INSTANCIA);
    expect(pedidos[0].corpo ?? "", "o `instance_id` foi parar no CORPO").not.toContain("instance_id");

    await page.screenshot({ path: `test-results/m37-fluxo-${vp.nome}.png`, fullPage: true });
    await info.attach(`m37-fluxo-${vp.nome}`, {
      path: `test-results/m37-fluxo-${vp.nome}.png`,
      contentType: "image/png",
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. A jornada geral não regride
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("a jornada geral continua sem Instância — e a query não ganha o parâmetro", async ({ page }) => {
  await comAuth(page);
  const pedidos = observarPrepare(page);

  await page.goto("/analyses/new");
  await page.getByRole("button", { name: /Iniciar análise|Start analysis/ }).click();
  await page.waitForURL(/\/analyses\/an-e2e/);

  expect(pedidos.length).toBe(1);
  expect(
    new URL(pedidos[0].url).searchParams.has("instance_id"),
    "a jornada geral passou a mandar contexto vazio",
  ).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. Deep link e refresh — o contexto vem do endereço, não da memória
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("refresh na Instância preserva o contexto, porque ele está na URL", async ({ page }) => {
  await comAuth(page);
  const pedidos = observarPrepare(page);

  await page.goto(`/instances/${INSTANCIA}`);
  await page.reload(); // nada em memória sobrevive a isto
  await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();

  await page.getByRole("button", { name: /Iniciar análise em|Start analysis in/ }).first().click();
  await page.waitForURL(/\/analyses\/an-e2e/);
  expect(new URL(pedidos[0].url).searchParams.get("instance_id")).toBe(INSTANCIA);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. Teclado e acessibilidade
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("o CTA é alcançável por TECLADO, e o nome acessível diz de qual Instância", async ({ page }) => {
  await comAuth(page);
  const pedidos = observarPrepare(page);
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();

  let achou = false;
  for (let i = 0; i < 40 && !achou; i++) {
    await page.keyboard.press("Tab");
    achou = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName === "BUTTON" && /Iniciar análise em|Start analysis in/.test(el.getAttribute("aria-label") ?? "");
    });
  }
  expect(achou, "o CTA da INST-04 não recebeu foco em 40 tabulações").toBe(true);

  // Foco visível — o anel do DS tem de existir no elemento focado.
  const temAnel = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const s = getComputedStyle(el);
    return el.className.includes("focus-visible:ring") || s.outlineStyle !== "none" || s.boxShadow !== "none";
  });
  expect(temAnel, "o CTA focado não tem indicação visível").toBe(true);

  await page.keyboard.press("Enter");
  await page.waitForURL(/\/analyses\/an-e2e/);
  expect(new URL(pedidos[0].url).searchParams.get("instance_id")).toBe(INSTANCIA);
});

test("axe: sem violação nova na superfície da INST-04", async ({ page }) => {
  await comAuth(page);
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const violacoes = await page.evaluate(async () => {
    const r = await (
      window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }
    ).axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
  });
  expect(violacoes, "violações de acessibilidade na superfície da M37").toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 5. O que a M37 não pode ter trazido
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("nenhuma criação nem configuração de Instância apareceu", async ({ page }) => {
  await comAuth(page);
  for (const rota of ["/instances", `/instances/${INSTANCIA}`]) {
    await page.goto(rota);
    const corpo = (await page.locator("body").innerText()).toLowerCase();
    for (const proibido of [
      "criar instância", "nova instância", "create instance", "new instance",
      "configurar instância", "configurações da instância", "instance settings", "rename",
    ]) {
      expect(corpo, `${rota} oferece o que não tem missão dona: ${proibido}`).not.toContain(proibido);
    }
  }
});
