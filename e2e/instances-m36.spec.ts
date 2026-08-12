// M36 · INST-01 + INST-03 — prova VISUAL em browser real.
//
// jsdom não computa layout: responsividade, foco visível e contraste só são prováveis aqui. O que
// o vitest cobre é semântica; o que esta spec cobre é a tela existindo de verdade nas três
// larguras, alcançável por teclado e sem violação de axe.
//
// A entrada é sempre pela URL, nunca por clique a partir de uma listagem já carregada. É de
// propósito: INST-01 promete reconstruir o contexto por deep link, e testar clicando provaria a
// navegação interna — justamente o caminho em que o defeito não aparece.

import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

const INSTANCIA = "inst-e2e-0000-4000-8000-000000000001";

async function comAuth(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

async function semOverflowHorizontal(page: Page) {
  const excesso = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(excesso, "sem overflow horizontal (scrollWidth ≤ clientWidth)").toBeLessThanOrEqual(1);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. Responsivo + captura, nas três larguras
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`INST-01+03 (${vp.nome}): Instância e histórico sem overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await comAuth(page);

    // DEEP LINK: entra direto pela URL, sem passar pela lista.
    await page.goto(`/instances/${INSTANCIA}`);

    await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Análises desta instância|Analyses in this instance/ })).toBeVisible();
    await expect(page.getByText("an-inst-0001")).toBeVisible();
    await semOverflowHorizontal(page);

    await page.screenshot({
      path: `test-results/m36-instancia-${vp.nome}.png`,
      fullPage: true,
    });
    await info.attach(`m36-instancia-${vp.nome}`, {
      path: `test-results/m36-instancia-${vp.nome}.png`,
      contentType: "image/png",
    });
  });
}

test("INST-01 vazio (desktop e mobile): workspace sem Instâncias", async ({ page }, info) => {
  await comAuth(page);
  // O vazio é pedido ao MSW por `sessionStorage`, e NÃO por `page.route`: o MSW é service worker
  // e intercepta antes do Playwright — a primeira versão deste caso "passava" a lista populada e
  // falhou com razão.
  await page.addInitScript(() => {
    sessionStorage.setItem("sentinela:e2e:instancias-vazias", "1");
  });

  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/instances");
    // O vazio EXPLICA o que é uma Instância — não oferece ação, porque criar não tem missão dona.
    await expect(
      page.getByText(/agrupam análises do mesmo sistema|group analyses of the same system/),
    ).toBeVisible();
    await semOverflowHorizontal(page);
    await page.screenshot({ path: `test-results/m36-vazio-${vp.nome}.png`, fullPage: true });
    await info.attach(`m36-vazio-${vp.nome}`, {
      path: `test-results/m36-vazio-${vp.nome}.png`,
      contentType: "image/png",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. Paginação por cursor, na tela
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("INST-03: a segunda página vem do cursor, sem repetir nem perder", async ({ page }) => {
  await comAuth(page);
  await page.goto(`/instances/${INSTANCIA}`);

  await expect(page.getByText("an-inst-0001")).toBeVisible();
  await expect(page.getByText("an-inst-0003")).toHaveCount(0);

  // A ORDEM é a do backend, e a massa vem propositalmente em ordem decrescente de id: se a tela
  // ordenasse localmente, `0001` viria antes de `0002` e este caso morreria.
  const ids = await page.locator("a[href^='/analyses/an-inst-']").allInnerTexts();
  expect(ids.map((x) => x.trim().split(/\s+/)[0])).toEqual(["an-inst-0002", "an-inst-0001"]);

  await page.getByRole("button", { name: /Próxima|Next/ }).click();

  await expect(page.getByText("an-inst-0003")).toBeVisible();
  // A primeira página saiu: é substituição por cursor, não acúmulo com offset local.
  await expect(page.getByText("an-inst-0001")).toHaveCount(0);

  await page.getByRole("button", { name: /Anterior|Previous/ }).click();
  await expect(page.getByText("an-inst-0001")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. Erro público — sem oráculo de existência
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("Instância inalcançável: a tela não diz se ela existe", async ({ page }) => {
  await comAuth(page);
  await page.goto("/instances/inst-que-nao-e-sua-0000-0000-000000000000");

  const corpo = (await page.locator("body").innerText()).toLowerCase();
  await expect(
    page.getByText(/não encontramos esta instância neste workspace|couldn't find this instance/i),
  ).toBeVisible();
  // A copy não pode escolher um lado do colapso que o backend faz de propósito.
  for (const proibido of ["não existe", "does not exist", "sem permissão", "no permission", "forbidden"]) {
    expect(corpo, `a tela revelou: ${proibido}`).not.toContain(proibido);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. Teclado e axe
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("teclado: o histórico é alcançável e o foco é visível", async ({ page }) => {
  await comAuth(page);
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(page.getByText("an-inst-0001")).toBeVisible();

  // Tab até o primeiro link de análise — sem mouse em momento nenhum.
  let achou = false;
  for (let i = 0; i < 40 && !achou; i++) {
    await page.keyboard.press("Tab");
    achou = await page.evaluate(() =>
      Boolean(document.activeElement?.getAttribute("href")?.includes("/analyses/an-inst-")),
    );
  }
  expect(achou, "nenhum link do histórico recebeu foco em 40 tabulações").toBe(true);

  // Foco VISÍVEL: o anel do DS tem de existir no elemento focado.
  const temAnel = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const s = getComputedStyle(el);
    return (
      el.className.includes("focus-visible:ring") ||
      s.outlineStyle !== "none" ||
      s.boxShadow !== "none"
    );
  });
  expect(temAnel, "o elemento focado não tem indicação visível").toBe(true);
});

test("axe: sem violação nova em INST-01 e no histórico", async ({ page }) => {
  await comAuth(page);
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // `axe-core` injetado do node_modules, e não o wrapper `@axe-core/playwright`: ele não está
  // instalado, e acrescentar dependência por conveniência de teste é mudança de stack.
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const violacoes = await page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe.run({
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
  });
  expect(violacoes, "violações de acessibilidade na superfície da M36").toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 5. Alcançabilidade — o caminho que o produto já tinha desenhado
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("Home → Instâncias → detalhe, sem digitar URL", async ({ page }, info) => {
  // O `/ux-heuristics` mediu 8,6 pelo Trunk Test: a superfície existia e não era alcançável.
  // A região 3 de D9 já era o ponto de entrada previsto; ela estava presa a um fato que a BD02
  // tornou falso. Este caso prova o caminho inteiro por CLIQUE — se ele voltar a morrer, a M36
  // deixa de ser alcançável e o teste cai junto.
  await comAuth(page);
  await page.goto("/home");

  const regiao = page.getByRole("region", { name: /Instâncias|Instances/ });
  await expect(regiao).toBeVisible();
  await page.screenshot({ path: "test-results/m36-home-instancias.png", fullPage: true });
  await info.attach("m36-home-instancias", {
    path: "test-results/m36-home-instancias.png",
    contentType: "image/png",
  });

  // Pela Home direto ao detalhe — o ramo "Sim, possui Instância" do Discovery §9.1.
  await regiao.getByRole("link", { name: "Produção" }).click();
  await page.waitForURL(/\/instances\/inst-e2e-/);
  await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();

  // E o caminho pela lista também existe.
  await page.goto("/home");
  await regiao.getByRole("link", { name: /Ver todas as instâncias|View all instances/ }).click();
  await page.waitForURL(/\/instances$/);
  await expect(page.getByRole("heading", { level: 1, name: /Instâncias|Instances/ })).toBeVisible();
});

test("a entrada pela Home funciona por TECLADO", async ({ page }) => {
  await comAuth(page);
  await page.goto("/home");
  await expect(page.getByRole("region", { name: /Instâncias|Instances/ })).toBeVisible();

  let chegou = false;
  for (let i = 0; i < 60 && !chegou; i++) {
    await page.keyboard.press("Tab");
    chegou = await page.evaluate(() =>
      Boolean(document.activeElement?.getAttribute("href")?.startsWith("/instances/")),
    );
  }
  expect(chegou, "o link da Instância não recebeu foco em 60 tabulações").toBe(true);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/instances\/inst-e2e-/);
  await expect(page.getByRole("heading", { level: 1, name: "Produção" })).toBeVisible();
});

test("nenhum item de Instâncias foi criado na sidebar, e nenhum CTA de criação existe", async ({ page }) => {
  // A alcançabilidade veio da seam que o produto já tinha, e não de navegação global nova —
  // isso era decisão de IA e ficou fora da M36. E criar Instância continua sem superfície autorizada.
  await comAuth(page);
  await page.goto("/home");
  const nav = page.getByRole("navigation").first();
  await expect(nav.getByRole("link", { name: /^Inst[âa]ncias$|^Instances$/ })).toHaveCount(0);

  for (const rota of ["/home", "/instances", "/instances/inst-e2e-0000-4000-8000-000000000001"]) {
    await page.goto(rota);
    const corpo = (await page.locator("body").innerText()).toLowerCase();
    for (const proibido of ["criar instância", "nova instância", "create instance", "new instance"]) {
      expect(corpo, `${rota} oferece criação, que não tem missão dona: ${proibido}`).not.toContain(proibido);
    }
  }
});
