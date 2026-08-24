// Responsividade automatizada da jornada canônica (Onda 6 E3 reconciliação, item 4).
//
// jsdom (vitest) não computa layout; a responsividade só é provável em browser real. Para cada
// viewport (desktop/tablet/mobile): sem overflow horizontal, dropzone utilizável, ações acessíveis,
// região de estado visível.

import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

const JSONL = { name: "data.jsonl", mimeType: "application/x-ndjson", buffer: Buffer.from('{"a":1}\n') };

async function enableAuth(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

async function semOverflowHorizontal(page: Page) {
  // MEDE O `main` TAMBÉM, e a razão é que só o documento era CEGO.
  //
  // `PageFrame` renderiza `<main class="flex-1 overflow-y-auto">`: quem rola é o `main`, e o
  // documento tem sempre a largura da janela. Medido no Diagnóstico V4 quebrado, a 375px:
  //
  //     document.scrollWidth - clientWidth = 0        <- esta função dizia "sem overflow"
  //     main.scrollWidth      - clientWidth = 493     <- a tela rolava meia largura de lado
  //
  // A versão anterior olhava só `document.scrollingElement`, então passava verde sobre 493px de
  // transbordo real. Ela media a casca; o defeito estava no que rola dentro dela.
  const { doc, main, culpados } = await page.evaluate(() => {
    const raiz = document.scrollingElement ?? document.documentElement;
    const m = document.querySelector("main");
    const nomes: string[] = [];
    if (m) {
      const caixa = m.getBoundingClientRect();
      m.querySelectorAll("*").forEach((el) => {
        const excede = Math.round(el.getBoundingClientRect().right - caixa.right);
        if (excede > 4) nomes.push(`${el.tagName.toLowerCase()} (+${excede}px)`);
      });
    }
    return {
      doc: raiz.scrollWidth - raiz.clientWidth,
      main: m ? m.scrollWidth - m.clientWidth : 0,
      culpados: [...new Set(nomes)].slice(0, 5),
    };
  });
  expect(doc, "sem overflow horizontal no documento").toBeLessThanOrEqual(1);
  expect(main, `sem overflow horizontal no <main> — ${culpados.join(", ")}`).toBeLessThanOrEqual(1);
}

for (const vp of VIEWPORTS) {
  test(`responsivo (${vp.nome}): entrada, dropzone e ações sem overflow horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await enableAuth(page);

    // entrada
    await page.goto("/canonical/analyses/new");
    await expect(page.getByRole("button", { name: "Start analysis" })).toBeVisible();
    await semOverflowHorizontal(page);

    // upload: dropzone utilizável + ação acessível
    await page.getByRole("button", { name: "Start analysis" }).click();
    // `/analyses/…`, não `/canonical/analyses/…`: `f182e4b` (M24) tirou o nome de camada interna
    // da URL pública. A entrada acima segue pelo endereço antigo, que hoje é redirect.
    await page.waitForURL(/\/analyses\/an-e2e/);
    await expect(page.getByText("Add your dataset")).toBeVisible(); // título da dropzone
    const enviar = page.getByRole("button", { name: "Send dataset" });
    await expect(enviar).toBeVisible();
    await expect(enviar).toBeInViewport(); // ação alcançável na viewport
    await semOverflowHorizontal(page);

    // região de estado visível após enviar/submeter
    await page.setInputFiles("#canonical-file", JSONL);
    await enviar.click();
    await page.getByRole("button", { name: "Submit for analysis" }).click();
    await expect(page.getByRole("status")).toBeVisible(); // banner de estado (aria-live)
    await semOverflowHorizontal(page);
  });
}
