// M38 · EVO-01 — prova VISUAL e de acessibilidade da superfície consolidada.
//
// A spec irmã (`evo01-m38-historico.spec.ts`) prova a MECÂNICA: fonte, cursor, ordem, redirect.
// Esta prova o que só o browser vê — as três larguras sem overflow, os três estados distintos
// (vazio, carregando, erro), o caminho por teclado e axe limpo.
//
// `loading` e `error` só são observáveis com seams no journey (`__sentinela_list_delay__` e
// `__sentinela_list_error__`), porque o MSW é service worker e vence o `page.route`. Sem eles a
// afirmação "os três estados são distintos" seria promessa de código, não prova de tela.

import { expect, test, type Page } from "@playwright/test";

const WS = "e2e-workspace-0000";

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

type Linha = {
  analysis_id: string;
  status: string;
  record_count: number | null;
  result_available: boolean;
  created_at: string | null;
};

const ITENS: Linha[] = [
  { analysis_id: "an-evo-0003", status: "completed", record_count: 1240, result_available: true, created_at: "2026-08-03T10:00:00Z" },
  { analysis_id: "an-evo-0002", status: "running", record_count: null, result_available: false, created_at: "2026-08-02T09:00:00Z" },
  { analysis_id: "an-evo-0001", status: "failed", record_count: 0, result_available: false, created_at: "2026-08-01T08:00:00Z" },
];

async function preparar(
  page: Page,
  opts: { itens?: Linha[]; next?: string | null; erro?: boolean; atraso?: number } = {},
) {
  const { itens = ITENS, next = "cur-2", erro = false, atraso = 0 } = opts;
  await page.addInitScript(
    ([ws, dados, prox, comErro, espera]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_list__",
        JSON.stringify({
          [`${ws}|`]: { items: dados, next_cursor: prox },
          [`${ws}|cur-2`]: {
            items: [{ analysis_id: "an-evo-0000", status: "completed", record_count: 12, result_available: true, created_at: "2026-07-31T07:00:00Z" }],
            next_cursor: null,
          },
        }),
      );
      if (comErro) sessionStorage.setItem("__sentinela_list_error__", "1");
      if (espera) sessionStorage.setItem("__sentinela_list_delay__", String(espera));
    },
    [WS, opts.itens ?? ITENS, next, erro, atraso] as const,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. Responsivo — as três larguras, com captura
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`EVO-01 (${vp.nome}): histórico e paginação sem overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await preparar(page);
    await page.goto("/analyses");
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();
    await expect(page.locator("li").filter({ hasText: "an-evo-0003" })).toBeVisible();

    const excesso = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(excesso, "overflow horizontal na EVO-01").toBeLessThanOrEqual(1);

    await page.screenshot({ path: `test-results/m38-analyses-${vp.nome}.png`, fullPage: true });
    await info.attach(`m38-analyses-${vp.nome}`, {
      path: `test-results/m38-analyses-${vp.nome}.png`,
      contentType: "image/png",
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. Os três estados são DISTINTOS
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("vazio: explica, não parece defeito", async ({ page }, info) => {
  await preparar(page, { itens: [], next: null });
  await page.goto("/analyses");
  await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();
  await expect(page.locator("li a[href^='/analyses/an-']")).toHaveCount(0);
  // Vazio é `role="status"` — o padrão do DS. Erro é `role="alert"`: as duas coisas não podem
  // colapsar no mesmo anúncio para quem usa leitor de tela.
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.screenshot({ path: "test-results/m38-analyses-vazio.png", fullPage: true });
  await info.attach("m38-analyses-vazio", { path: "test-results/m38-analyses-vazio.png", contentType: "image/png" });
});

test("carregando: aparece antes da lista, e não é o vazio", async ({ page }) => {
  await preparar(page, { atraso: 1200 });
  await page.goto("/analyses");
  // Enquanto a resposta não chega, a tela tem de dizer que está carregando — e NÃO afirmar que
  // não há nada, que é a confusão que a M38 precisa impedir.
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator("li a[href^='/analyses/an-']")).toHaveCount(0);
  await expect(page.locator("li").filter({ hasText: "an-evo-0003" })).toBeVisible({ timeout: 5000 });
});

test("erro: é alerta, oferece retomada, e não vira lista vazia", async ({ page }, info) => {
  await preparar(page, { erro: true });
  await page.goto("/analyses");

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("li a[href^='/analyses/an-']")).toHaveCount(0);
  // O erro não pode se disfarçar de vazio: se os dois usassem o mesmo anúncio, a falha de rede
  // apareceria como "você ainda não tem análises".
  const alerta = await page.getByRole("alert").innerText();
  expect(alerta.toLowerCase()).not.toMatch(/no analyses yet|nenhuma análise ainda/);

  await page.screenshot({ path: "test-results/m38-analyses-erro.png", fullPage: true });
  await info.attach("m38-analyses-erro", { path: "test-results/m38-analyses-erro.png", contentType: "image/png" });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. Teclado e axe
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("teclado: a lista e a paginação são operáveis sem mouse", async ({ page }) => {
  await preparar(page);
  await page.goto("/analyses");
  await expect(page.locator("li").filter({ hasText: "an-evo-0003" })).toBeVisible();

  let achou = false;
  for (let i = 0; i < 40 && !achou; i++) {
    await page.keyboard.press("Tab");
    achou = await page.evaluate(() =>
      Boolean(document.activeElement?.getAttribute("href")?.startsWith("/analyses/an-evo-")),
    );
  }
  expect(achou, "nenhum item da lista recebeu foco em 40 tabulações").toBe(true);

  const temAnel = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const s = getComputedStyle(el);
    return el.className.includes("focus-visible:ring") || s.outlineStyle !== "none" || s.boxShadow !== "none";
  });
  expect(temAnel, "o item focado não tem indicação visível").toBe(true);

  // "Próxima" é alcançável e leva à segunda página por teclado.
  let naPaginacao = false;
  for (let i = 0; i < 20 && !naPaginacao; i++) {
    await page.keyboard.press("Tab");
    naPaginacao = await page.evaluate(() => /Next|Próxima/.test(document.activeElement?.textContent ?? ""));
  }
  expect(naPaginacao, "a paginação não é alcançável por teclado").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("li").filter({ hasText: "an-evo-0000" })).toBeVisible();
});

test("axe: sem violação na EVO-01, populada e vazia", async ({ page }) => {
  for (const vazio of [false, true]) {
    await preparar(page, vazio ? { itens: [], next: null } : {});
    await page.goto("/analyses");
    await expect(page.getByTestId("canonical-analyses-list")).toBeVisible();

    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violacoes = await page.evaluate(async () => {
      const r = await (
        window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }
      ).axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
    });
    expect(violacoes, `violações de acessibilidade na EVO-01 (vazio=${vazio})`).toEqual([]);
  }
});
