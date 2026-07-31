// E7 — contraste WCAG AA medido no DOM VIVO das superfícies canônicas (itens 25 e 30).
//
// Não confia em tabela de cores: lê a cor computada de cada texto e a cor de fundo EFETIVA
// (subindo a árvore até achar um fundo não transparente) e calcula a razão de contraste real.
// Também produz screenshots para inspeção visual da consolidação (item 22: nunca substituir
// hardcode sem olhar).

import { expect, test, type Page } from "@playwright/test";

const AA_TEXTO_NORMAL = 4.5;

async function habilitar(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    if (!sessionStorage.getItem("__sentinela_list__")) {
      sessionStorage.setItem(
        "__sentinela_list__",
        JSON.stringify({
          "e2e-workspace-0000|": {
            items: [
              { analysis_id: "an-c1", status: "completed", record_count: 10, result_available: true, created_at: "2026-07-31T10:00:00Z" },
            ],
            next_cursor: null,
          },
        }),
      );
    }
  });
}

/** Razão de contraste real dos textos visíveis, medida no navegador (função real, não string). */
function medir() {
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const fundoEfetivo = (el) => {
    let n = el;
    while (n) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
      n = n.parentElement;
    }
    return { r: 6, g: 11, b: 19, a: 1 };
  };
  const saida = [];
  for (const el of Array.from(document.querySelectorAll('h1,h2,p,span,dt,dd,a,button,li'))) {
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 120) continue;
    if (el.querySelector('h1,h2,p,span,dt,dd,a,button,li')) continue; // só folhas
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) < 0.5) continue;
    const fg = parse(st.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = fundoEfetivo(el);
    const L1 = lum(fg.r, fg.g, fg.b), L2 = lum(bg.r, bg.g, bg.b);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(st.fontSize);
    const peso = parseInt(st.fontWeight) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    saida.push({ txt: txt.slice(0, 40), ratio: Math.round(ratio * 100) / 100, grande });
  }
  return saida;
}

const ROTAS = [
  { nome: "lista", url: "/canonical/analyses", ancora: "Your analyses" },
  { nome: "entrada", url: "/canonical/analyses/new", ancora: "New analysis" },
];

for (const rota of ROTAS) {
  test(`contraste AA no DOM vivo — ${rota.nome}`, async ({ page }, testInfo) => {
    await habilitar(page);
    await page.goto(rota.url);
    await expect(page.getByText(rota.ancora).first()).toBeVisible();

    // evidência visual da consolidação (inspeção, não substituição cega)
    await testInfo.attach(`${rota.nome}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    const medidas = await page.evaluate(medir);
    expect(medidas.length, "mediu textos reais").toBeGreaterThan(3);
    const reprovados = medidas.filter((m) => !m.grande && m.ratio < AA_TEXTO_NORMAL);
    expect(
      reprovados,
      `textos abaixo de ${AA_TEXTO_NORMAL}:1 → ${JSON.stringify(reprovados.slice(0, 6))}`,
    ).toEqual([]);
  });
}
