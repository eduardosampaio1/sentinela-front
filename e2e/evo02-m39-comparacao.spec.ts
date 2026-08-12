// M39 · EVO-02 — comparação A×B em browser real.
//
// Os gates centrais da missão são de CUSTO e de IDENTIDADE, e só o browser os prova: nenhuma
// leitura de `/result` antes da intenção de comparar, exatamente duas depois, e A/B reconstruídos
// **apenas** pelos ids da rota — sem depender de a listagem ter sido carregada antes.
//
// O terceiro é de honestidade: `comparacao.ts` não publica delta, então a tela não pode exibir
// seta, percentual, A−B nem barra divergente. A especificação de data-viz do Blueprint descreve
// como um delta SERIA renderizado se existisse; ela não autoriza inventá-lo.

import { expect, test, type Page } from "@playwright/test";
// Massa REAL: `massas.ts` guarda documentos que são saída do backend, e é a fonte que a própria
// fixture de envelope aponta. O `RESULT_VIEW` servido por padrão pelo journey traz só
// `{ summary }` — sem indicador, a regra canônica não tem o que parear, e a tela mostraria
// "sem comparação" com razão. Provar a apresentação exige o documento completo.
import { MASSA_A, MASSA_B } from "@/test/fixtures/canonical-result/massas";

const WS = "e2e-workspace-0000";
const A = "an-cmp-antiga";
const B = "an-cmp-nova";

type Linha = {
  analysis_id: string;
  status: string;
  record_count: number | null;
  result_available: boolean;
  created_at: string | null;
};

const ITENS: Linha[] = [
  { analysis_id: B, status: "completed", record_count: 900, result_available: true, created_at: "2026-08-02T10:00:00Z" },
  { analysis_id: A, status: "completed", record_count: 800, result_available: true, created_at: "2026-08-01T10:00:00Z" },
];

// A quebra documental (`comparison-schema-break`, scenario 21) NÃO é semeada aqui, e isso é
// decisão, não esquecimento. `indicator_registry_version` vem do envelope e não varia por
// `analysis_id` no journey; fabricar a variação exigiria um seam que o produto não tem. O DoD
// pede o scenario verde na REGRA canônica — e lá ele é provado em unidade, sobre o documento.
// O que esta spec deve ao browser são as três invariantes herdadas da M38: nenhuma leitura de
// `/result` antes da ação, exatamente duas depois, e nenhuma rota legada acordada.
//
// Houve aqui um ramo `registryB` que fingia cobrir isso. Nenhum caso o acionava, e o corpo
// sobrescrevia o seam inteiro com `{ [regB]: true }` — teria destruído MASSA_A/MASSA_B se
// alguém o tivesse chamado. Código morto que promete capacidade é pior que ausência: ele
// responde "coberto" a quem procurar pelo nome.
async function preparar(page: Page) {
  await page.addInitScript(
    ([ws, itens, ids, docs]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem("__sentinela_list__", JSON.stringify({ [`${ws}|`]: { items: itens, next_cursor: null } }));
      sessionStorage.setItem("__sentinela_result__", JSON.stringify({ [ids[0]]: docs[0], [ids[1]]: docs[1] }));
    },
    [WS, ITENS, [A, B], [MASSA_A, MASSA_B]] as const,
  );
}

/** Conta as leituras de `/result`, que é o gate de custo desta missão. */
function observarResultados(page: Page) {
  const lidos: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (/\/v1\/analyses\/[^/]+\/result$/.test(u.pathname)) lidos.push(u.pathname);
  });
  return lidos;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 1. Custo — nada antes da intenção, exatamente duas depois
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("nenhuma leitura de /result antes de comparar; exatamente duas depois", async ({ page }) => {
  const lidos = observarResultados(page);
  await preparar(page);
  await page.goto("/analyses");
  await expect(page.locator("li").filter({ hasText: B })).toBeVisible();

  expect(lidos, "a listagem buscou resultado por linha").toEqual([]);

  await page.getByRole("button", { name: /Comparar$|^Compare$/ }).click();
  await page.locator("li").filter({ hasText: A }).getByRole("checkbox").check();
  await page.locator("li").filter({ hasText: B }).getByRole("checkbox").check();
  expect(lidos, "escolher já buscou resultado — a leitura é da ação, não da seleção").toEqual([]);

  await page.getByRole("button", { name: /Comparar as duas|Compare the two/ }).click();
  await page.waitForURL(new RegExp(`/analyses/compare/${A}/${B}$`));
  await expect(page.getByRole("heading", { level: 1, name: /Comparar análises|Compare analyses/ })).toBeVisible();

  await expect.poll(() => lidos.length, { message: "comparar lê A e B, e só eles" }).toBe(2);
  expect(new Set(lidos).size, "leu o mesmo duas vezes").toBe(2);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 2. Identidade — só os ids da rota
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("deep link e refresh reconstroem A e B pelos ids, sem passar pela lista", async ({ page }) => {
  const lidos = observarResultados(page);
  await preparar(page);
  // Entra DIRETO na comparação: se a tela dependesse da listagem carregada antes, morreria aqui.
  await page.goto(`/analyses/compare/${A}/${B}`);
  await expect(page.getByRole("heading", { level: 1, name: /Comparar análises|Compare analyses/ })).toBeVisible();
  await expect.poll(() => lidos.length).toBe(2);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Comparar análises|Compare analyses/ })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/analyses/compare/${A}/${B}$`));
});

test("a ordem A/B é a da URL", async ({ page }) => {
  await preparar(page);
  await page.goto(`/analyses/compare/${B}/${A}`);
  // A copy nomeia os lados: "A: <id> · B: <id>". Nomear é o que impede a tela de afirmar ordem
  // cronológica — a rota publica posição, não tempo.
  await expect(page.getByText(`A: ${B} · B: ${A}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 3. Honestidade — a regra decide, a tela apresenta
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("comparação compatível: dois valores lado a lado, e NENHUM delta", async ({ page }, info) => {
  await preparar(page);
  await page.goto(`/analyses/compare/${A}/${B}`);
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();

  const corpo = (await page.locator("main, body").first().innerText()).toLowerCase();
  // Nada que afirme movimento entre os dois: o contrato não publica variação.
  // "previous" saiu junto: na EVO-02 os lados vêm da URL, e chamar A de anterior seria afirmar
  // um fato que nem a rota nem o contrato publicam.
  expect(corpo, "a tela afirmou relação temporal que a rota não publica").not.toContain("previous");
  for (const proibido of ["▲", "▼", "↑", "↓", "aumento", "queda", "melhora", "piora", "increase", "decrease"]) {
    expect(corpo, `a tela inventou variação: ${proibido}`).not.toContain(proibido.toLowerCase());
  }

  await page.screenshot({ path: "test-results/m39-compare-desktop.png", fullPage: true });
  await info.attach("m39-compare-desktop", { path: "test-results/m39-compare-desktop.png", contentType: "image/png" });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 4. Responsivo, teclado e axe
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const vp of [
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const) {
  test(`comparação (${vp.nome}): sem overflow horizontal`, async ({ page }, info) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await preparar(page);
    await page.goto(`/analyses/compare/${A}/${B}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const excesso = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(excesso, "overflow horizontal na comparação").toBeLessThanOrEqual(1);

    await page.screenshot({ path: `test-results/m39-compare-${vp.nome}.png`, fullPage: true });
    await info.attach(`m39-compare-${vp.nome}`, {
      path: `test-results/m39-compare-${vp.nome}.png`,
      contentType: "image/png",
    });
  });
}

test("a seleção é operável por TECLADO, do início à comparação", async ({ page }, info) => {
  await preparar(page);
  await page.goto("/analyses");
  await expect(page.locator("li").filter({ hasText: B })).toBeVisible();

  await page.getByRole("button", { name: /Comparar$|^Compare$/ }).click();
  await page.screenshot({ path: "test-results/m39-selecao-desktop.png", fullPage: true });
  await info.attach("m39-selecao-desktop", { path: "test-results/m39-selecao-desktop.png", contentType: "image/png" });

  // Tab até o primeiro checkbox, marca com espaço — sem mouse.
  let achou = false;
  for (let i = 0; i < 40 && !achou; i++) {
    await page.keyboard.press("Tab");
    achou = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type === "checkbox");
  }
  expect(achou, "nenhum checkbox recebeu foco em 40 tabulações").toBe(true);
  await page.keyboard.press("Space");

  // Entre um checkbox e o próximo existe o LINK do item — é essa separação que faz "abrir" e
  // "escolher" serem alvos distintos. Por isso o segundo é alcançado por laço, e não por um
  // `Tab` contado: contar posições codificaria a composição dentro do teste.
  let segundo = false;
  for (let i = 0; i < 10 && !segundo; i++) {
    await page.keyboard.press("Tab");
    segundo = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type === "checkbox");
  }
  expect(segundo, "o segundo checkbox não foi alcançado por teclado").toBe(true);
  await page.keyboard.press("Space");

  await page.getByRole("button", { name: /Comparar as duas|Compare the two/ }).click();
  await page.waitForURL(/\/analyses\/compare\/an-cmp-/);
});

test("axe: sem violação na seleção e na comparação", async ({ page }) => {
  for (const rota of ["/analyses", `/analyses/compare/${A}/${B}`]) {
    await preparar(page);
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (rota === "/analyses") await page.getByRole("button", { name: /Comparar$|^Compare$/ }).click();

    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violacoes = await page.evaluate(async () => {
      const r = await (
        window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }
      ).axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
    });
    expect(violacoes, `violações de acessibilidade em ${rota}`).toEqual([]);
  }
});
