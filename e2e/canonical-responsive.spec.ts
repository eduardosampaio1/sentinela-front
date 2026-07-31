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
  const excesso = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(excesso, "sem overflow horizontal (scrollWidth ≤ clientWidth)").toBeLessThanOrEqual(1);
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
    await page.waitForURL(/\/canonical\/analyses\/an-e2e/);
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
