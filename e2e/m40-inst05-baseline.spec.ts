// M40 · INST-05 — a análise de referência em BROWSER REAL.
//
// O que só o browser prova, e que o vitest não alcança:
//
// - que **exatamente um** `POST` sai quando se elege, e **nenhum** sai sozinho;
// - que a troca A→B **não emite `DELETE`** — a garantia central da BD10, invisível fora da rede;
// - que a consulta de candidatos leva os **dois** filtros;
// - que a tela não pré-seleciona a mais recente;
// - layout, foco, teclado e axe, que jsdom não computa.
//
// A massa do browser tem `created_at` fora de ordem em relação aos ids de propósito: se a tela
// vier a escolher "a última concluída" — o que D25 proíbe — ela apontará para `an-cand-e2e-0002`,
// e o caso 12 vê.

import { expect, test, type Page, type Request } from "@playwright/test";

const INSTANCIA = "inst-e2e-0000-4000-8000-000000000001";
const A = "an-cand-e2e-0001";
const B = "an-cand-e2e-0003";
const MAIS_RECENTE = "an-cand-e2e-0002";

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

/** Semeia auth e, opcionalmente, o estado inicial do ponteiro. */
async function semear(
  page: Page,
  opts: { baseline?: string | null; semCandidatos?: boolean } = {},
) {
  await page.addInitScript(
    ([baseline, sem]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (baseline) {
        sessionStorage.setItem(
          "__sentinela_baseline__",
          JSON.stringify({ id: baseline, setAt: "2026-08-06T13:22:00Z" }),
        );
      }
      if (sem) sessionStorage.setItem("__sentinela_baseline_sem_candidatos__", "1");
    },
    [opts.baseline ?? null, opts.semCandidatos ? "1" : ""] as const,
  );
}

/** Registra o que a rede recebeu. É a evidência de tudo que esta spec afirma. */
function espiar(page: Page) {
  const req: { metodo: string; url: string; corpo: string | null }[] = [];
  page.on("request", (r: Request) => {
    const u = r.url();
    if (u.includes("/v1/instances/") || u.includes("/v1/analyses")) {
      req.push({ metodo: r.method(), url: u, corpo: r.postData() });
    }
  });
  return req;
}

type Req = { metodo: string; url: string; corpo: string | null };
const doBaseline = (req: Req[]) => req.filter((r) => r.url.includes("/baseline"));
const secao = (page: Page) =>
  page.getByRole("region", { name: /Análise de referência|Reference analysis/ });

async function abrir(page: Page) {
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(secao(page)).toBeVisible();
}

async function semOverflow(page: Page) {
  const excesso = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(excesso, "sem overflow horizontal").toBeLessThanOrEqual(1);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// A. NO_BASELINE — e ZERO POST espontâneo
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("A · sem referência: a tela lê baseline e candidatos, e não elege ninguém", async ({ page }) => {
  const req = espiar(page);
  await semear(page);
  await abrir(page);

  await expect(secao(page).getByText(/ainda não tem uma análise de referência|doesn't have a reference analysis yet/)).toBeVisible();

  // Os três candidatos aparecem — ausência de régua NÃO é ausência de candidatos.
  await expect(secao(page).getByRole("listitem")).toHaveCount(3);

  const baseline = doBaseline(req);
  expect(baseline.filter((r) => r.metodo === "GET").length, "leu o ponteiro").toBeGreaterThan(0);
  // A prova que D25 exige: esperar não produz referência.
  expect(baseline.filter((r) => r.metodo === "POST"), "POST espontâneo").toEqual([]);
  expect(baseline.filter((r) => r.metodo === "DELETE"), "DELETE espontâneo").toEqual([]);

  // E a consulta de candidatos levou os DOIS filtros.
  const candidatos = req.filter((r) => r.url.includes("baseline_eligible=true"));
  expect(candidatos.length).toBeGreaterThan(0);
  expect(candidatos.every((r) => r.url.includes(`instance_id=${INSTANCIA}`))).toBe(true);
});

test("A2 · esperar não cria referência — a tela continua sem régua", async ({ page }) => {
  const req = espiar(page);
  await semear(page);
  await abrir(page);
  await page.waitForTimeout(1200);
  expect(doBaseline(req).filter((r) => r.metodo === "POST")).toEqual([]);
  await expect(secao(page).getByText(/ainda não tem|doesn't have/)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// B. SET — exatamente um POST, com a identidade escolhida
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("B · eleger emite UM POST, com a identidade no corpo", async ({ page }) => {
  const req = espiar(page);
  await semear(page);
  await abrir(page);

  await secao(page).getByRole("button", { name: new RegExp(A) }).click();
  await expect(secao(page).getByText(/Referência atual|Current reference/).first()).toBeVisible();

  const posts = doBaseline(req).filter((r) => r.metodo === "POST");
  expect(posts, "exatamente um POST").toHaveLength(1);
  expect(posts[0].corpo ?? "").toContain(A);
  // A tela reflete a RESPOSTA, e o id eleito aparece.
  await expect(secao(page).getByText(A).first()).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// C. REPLACE — A→B sem NENHUM DELETE
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("C · trocar A→B não emite DELETE", async ({ page }) => {
  const req = espiar(page);
  await semear(page, { baseline: A });
  await abrir(page);
  await expect(secao(page).getByText(A).first()).toBeVisible();

  await secao(page).getByRole("button", { name: new RegExp(B) }).click();
  await expect(secao(page).getByText(B).first()).toBeVisible();

  const baseline = doBaseline(req);
  expect(baseline.filter((r) => r.metodo === "DELETE"), "a troca passou por remoção").toEqual([]);
  const posts = baseline.filter((r) => r.metodo === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0].corpo ?? "").toContain(B);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// D. CLEAR
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("D · remover volta a NO_BASELINE, e não escolhe substituto", async ({ page }) => {
  const req = espiar(page);
  await semear(page, { baseline: A });
  await abrir(page);

  await secao(page).getByRole("button", { name: /Remover referência|Remove the reference/ }).click();
  await expect(secao(page).getByText(/ainda não tem|doesn't have/)).toBeVisible();

  const baseline = doBaseline(req);
  expect(baseline.filter((r) => r.metodo === "DELETE")).toHaveLength(1);
  // Nenhum POST depois da remoção: a tela não elege substituto, mesmo com candidatos na lista.
  const posts = baseline.filter((r) => r.metodo === "POST");
  expect(posts, "a tela escolheu substituto").toEqual([]);
  await expect(secao(page).getByRole("listitem")).toHaveCount(3);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// E. ZERO CANDIDATOS
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("E · zero candidatos é estado vazio explicado, não erro", async ({ page }) => {
  await semear(page, { semCandidatos: true });
  await abrir(page);

  await expect(secao(page).getByRole("listitem")).toHaveCount(0);
  await expect(
    secao(page).getByText(/Nenhuma análise pode ser referência ainda|No analysis can be the reference yet/),
  ).toBeVisible();
  // E NÃO é erro: nenhum alerta, nenhum "tente novamente".
  await expect(secao(page).getByRole("alert")).toHaveCount(0);
  await expect(secao(page).getByText(/Tente novamente|Try again/)).toHaveCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// F/G. REFRESH e DEEP LINK
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("F · a referência sobrevive ao refresh", async ({ page }) => {
  await semear(page);
  await abrir(page);
  await secao(page).getByRole("button", { name: new RegExp(A) }).click();
  await expect(secao(page).getByText(A).first()).toBeVisible();

  await page.reload();
  await expect(secao(page)).toBeVisible();
  await expect(secao(page).getByText(A).first()).toBeVisible();
});

test("G · deep link direto na Instância mostra a referência correta", async ({ page }) => {
  await semear(page, { baseline: B });
  // Entra pela URL, sem passar pela lista: é o caminho normal de quem cola um link.
  await page.goto(`/instances/${INSTANCIA}`);
  await expect(secao(page).getByText(B).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`/instances/${INSTANCIA}`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// H. TECLADO
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("H · eleger é alcançável só com o teclado, e o foco é visível", async ({ page }) => {
  const req = espiar(page);
  await semear(page);
  await abrir(page);

  const botao = secao(page).getByRole("button", { name: new RegExp(A) });
  await botao.focus();
  await expect(botao).toBeFocused();
  const contorno = await botao.evaluate((el) => {
    const s = getComputedStyle(el, ":focus-visible");
    return `${s.outlineStyle}|${s.outlineWidth}|${s.boxShadow}`;
  });
  expect(contorno, "foco sem indicação visual").not.toBe("none|0px|none");

  await page.keyboard.press("Enter");
  await expect(secao(page).getByText(A).first()).toBeVisible();
  expect(doBaseline(req).filter((r) => r.metodo === "POST")).toHaveLength(1);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// I. RESPONSIVO
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test(`I · ${vp.nome}: identidade e ação legíveis, sem overflow`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await semear(page, { baseline: A });
    await abrir(page);

    await expect(secao(page).getByText(A).first()).toBeVisible();
    // A ação de cada linha continua alcançável na largura estreita — no mobile ela cai para
    // baixo da identidade em vez de disputar a mesma linha.
    await expect(secao(page).getByRole("button", { name: new RegExp(B) })).toBeVisible();
    await semOverflow(page);
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// J. AXE
// ─────────────────────────────────────────────────────────────────────────────────────────────

for (const estado of ["sem-referencia", "com-referencia", "sem-candidatos"] as const) {
  test(`J · axe sem violações — ${estado}`, async ({ page }) => {
    await semear(page, {
      baseline: estado === "com-referencia" ? A : null,
      semCandidatos: estado === "sem-candidatos",
    });
    await abrir(page);
    // `axe-core` do node_modules, e não o wrapper `@axe-core/playwright`: ele não está instalado,
    // e acrescentar dependência por conveniência de teste é mudança de stack. Mesmo mecanismo da
    // M36 — um segundo jeito de rodar axe daria dois resultados possíveis para a mesma pergunta.
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const violacoes = await page.evaluate(async () => {
      const r = await (
        window as unknown as {
          axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> };
        }
      ).axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
    });
    expect(violacoes, `violações em ${estado}`).toEqual([]);
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 12. A catraca de D25 — a tela não elege a mais recente
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("12 · nada é pré-selecionado, e a mais recente não recebe destaque", async ({ page }) => {
  await semear(page);
  await abrir(page);

  // Nenhum badge de "referência atual" antes de alguém escolher.
  await expect(secao(page).getByText(/Referência atual|Current reference/)).toHaveCount(0);
  // E os três candidatos têm o MESMO controle: o mais recente não ganha tratamento diferente.
  for (const id of [A, MAIS_RECENTE, B]) {
    await expect(secao(page).getByRole("button", { name: new RegExp(id) })).toBeVisible();
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 13. As proibições, medidas na REDE
// ─────────────────────────────────────────────────────────────────────────────────────────────

test("13 · a seção não chama /analytics, /result nem pede v3", async ({ page }) => {
  const todas: string[] = [];
  page.on("request", (r) => todas.push(r.url()));
  await semear(page, { baseline: A });
  await abrir(page);
  await secao(page).getByRole("button", { name: new RegExp(B) }).click();
  await expect(secao(page).getByText(B).first()).toBeVisible();

  expect(todas.filter((u) => u.includes("/analytics")), "chamou o Analytics").toEqual([]);
  expect(todas.filter((u) => u.includes("/result")), "chamou o documento canônico").toEqual([]);
  expect(todas.filter((u) => u.includes("result_schema_version")), "pediu v3").toEqual([]);
});

test("14 · nenhum vocabulário de comparação na seção", async ({ page }) => {
  await semear(page, { baseline: A });
  await abrir(page);
  const texto = (await secao(page).innerText()).toLowerCase();
  for (const proibido of [
    "delta", "evolu", "tendência", "tendencia", "melhor", "pior", "variação", "variacao",
    "comparad", "desde então", "higher", "lower",
  ]) {
    expect(texto.includes(proibido), `a seção diz "${proibido}"`).toBe(false);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// 15. O 409 da corrida — o único erro que o fluxo normal pode produzir
// ─────────────────────────────────────────────────────────────────────────────────────────────
//
// Este caso nasceu de um SOBREVIVENTE: trocar `error={erroDaMutacao}` por `error={null}` não
// reprovava nada. O clique ficava sem efeito e sem motivo — o pior par possível, porque o usuário
// não tem como distinguir "falhou" de "não registrou meu clique".
//
// O 409 não deveria ocorrer pelo fluxo normal, porque o backend só oferece elegíveis. Mas ele
// PODE ocorrer por corrida entre a leitura da lista e a escrita, e é justamente por ser raro que
// ninguém o veria quebrado.

test("15 · 409 na eleição é EXPLICADO, não engolido", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem("__sentinela_baseline_409__", "1");
  });
  await abrir(page);

  await secao(page).getByRole("button", { name: new RegExp(A) }).click();

  // A tela DIZ alguma coisa — e não fica igual ao estado anterior.
  await expect(secao(page).getByRole("alert")).toBeVisible();
  // E não fingiu sucesso: continua sem régua.
  await expect(secao(page).getByText(/ainda não tem|doesn't have/)).toBeVisible();
});
