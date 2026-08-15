// M41 · CFG-01/CFG-02 — a conta em BROWSER REAL.
//
// O que só o browser prova, e o vitest não alcança:
//
// - que **nenhum `PUT` sai sozinho** ao abrir a tela — o defeito silencioso desta capacidade seria
//   a leitura fabricar uma escolha;
// - que quem está no padrão consegue **salvar inglês explicitamente**, o que um `select` já
//   marcado em English tornaria impossível;
// - que `localStorage: pt` **perde** para o backend, e não provoca escrita nenhuma;
// - que a experiência estabiliza no idioma da CONTA depois do bootstrap, com cache vazio;
// - que o Account fora do ar não derruba a aplicação nem vira "você nunca escolheu";
// - foco, teclado, layout e axe, que jsdom não computa.

import { expect, test, type Page, type Request } from "@playwright/test";

// ## Por que este spec BLOQUEIA service worker
//
// A primeira execução falhou em 12 casos com "element(s) not found", e a causa não estava na
// tela: as requisições saíam (`page.on("request")` as via) e **nenhuma** `page.route` disparava.
// Um service worker responde ANTES da camada de rede que o Playwright intercepta, então os
// handlers deste arquivo eram silenciosamente ignorados e a tela recebia 404.
//
// O sintoma engana de propósito — "não achei o elemento" parece defeito de UI. Bloquear o worker
// aqui deixa a rede deste spec inteira sob controle do teste, que é o que permite CONTAR os
// `PUT` e afirmar que nenhum sai sozinho.
test.use({ serviceWorkers: "block" });

type Idioma = "en" | "pt";
type Guardado = Idioma | null;

const ROTA = "/dashboard/settings";

const IDENTIDADE = {
  user: { id: "u-kc-4417", email: "ana.ribeiro@cliente.test", name: "Ana Ribeiro" },
  workspaces: [
    { id: "ws-acme", name: "Acme", role: "owner" },
    { id: "ws-acme-lab", name: "Acme · Laboratório", role: "member" },
  ],
  capabilities: { canonical_analysis_enabled: true },
};

const VIEWPORTS = [
  { nome: "desktop", width: 1280, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "mobile", width: 375, height: 812 },
] as const;

interface Rede {
  pedidos: { metodo: string; url: string; corpo: string | null; cabecalhos: Record<string, string> }[];
  puts: () => number;
}

/**
 * Monta a conta na rede do browser.
 *
 * `inicial` é o `stored_language`, e `null` significa **nunca escolheu** — não "inglês". O handler
 * projeta `effective` como o Account projeta, e **só escreve no `PUT`**.
 */
async function montarConta(
  page: Page,
  opts: {
    inicial?: Guardado;
    cacheLocal?: Idioma;
    idiomaIndisponivel?: boolean;
    falharEscrita?: boolean;
  } = {},
): Promise<Rede> {
  const rede: Rede = { pedidos: [], puts: () => rede.pedidos.filter((p) => p.metodo === "PUT").length };
  let guardado: Guardado = opts.inicial ?? null;

  await page.addInitScript(
    ([cache]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (cache) window.localStorage.setItem("sentinela:language", cache as string);
      else window.localStorage.removeItem("sentinela:language");
    },
    [opts.cacheLocal ?? ""] as const,
  );

  page.on("request", (r: Request) => {
    if (!r.url().includes("/v1/")) return;
    rede.pedidos.push({
      metodo: r.method(),
      url: r.url(),
      corpo: r.postData(),
      cabecalhos: r.headers(),
    });
  });

  await page.route("**/v1/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );

  await page.route("**/v1/me/language", async (route) => {
    const pedido = route.request();

    if (opts.idiomaIndisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", detail: "account_unavailable" }),
      });
    }

    if (pedido.method() === "PUT") {
      if (opts.falharEscrita) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ code: "temporarily_unavailable" }),
        });
      }
      const corpo = JSON.parse(pedido.postData() ?? "{}") as { language?: Idioma };
      guardado = corpo.language ?? guardado;
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stored_language: guardado,
        effective_language: guardado ?? "en",
      }),
    });
  });

  return rede;
}

const salvar = (page: Page) => page.getByRole("button", { name: /Save language|Salvar idioma/ });
const radio = (page: Page, nome: RegExp) => page.getByRole("radio", { name: nome });

// ══════════════════════════════════════════════════════════════════════════════════════════
// A · CFG-01 — identidade
// ══════════════════════════════════════════════════════════════════════════════════════════

test("A · a identidade vem de /v1/me e aparece na tela", async ({ page }) => {
  const rede = await montarConta(page);
  await page.goto(ROTA);

  await expect(page.getByText("Ana Ribeiro")).toBeVisible();
  await expect(page.getByText("ana.ribeiro@cliente.test")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Acme" }).first()).toBeVisible();

  expect(rede.pedidos.some((p) => p.metodo === "GET" && p.url.endsWith("/v1/me"))).toBe(true);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// B · o estado padrão, e a ausência de escrita espontânea
// ══════════════════════════════════════════════════════════════════════════════════════════

test("B · nunca escolheu: a tela diz que é o PADRÃO, e ZERO PUT sai", async ({ page }) => {
  const rede = await montarConta(page, { inicial: null });
  await page.goto(ROTA);

  await expect(page.getByText(/Using English, the default/)).toBeVisible();
  // A frase de escolha salva NÃO pode aparecer — é a diferença entre os dois estados.
  await expect(page.getByText(/is your chosen language/)).toHaveCount(0);

  await page.waitForTimeout(600);
  expect(rede.puts(), "a leitura fabricou uma escolha").toBe(0);
});

test("C · do padrão, salvar INGLÊS explicitamente é possível e emite 1 PUT", async ({ page }) => {
  const rede = await montarConta(page, { inicial: null });
  await page.goto(ROTA);

  // O rádio já está em English porque é o idioma em uso. O botão continua disponível porque a
  // comparação é contra o que está SALVO — e não há nada salvo.
  await expect(radio(page, /English/)).toBeChecked();
  await expect(salvar(page)).toBeEnabled();

  await salvar(page).click();

  await expect(page.getByText(/English is your chosen language/)).toBeVisible();
  expect(rede.puts()).toBe(1);
  const put = rede.pedidos.find((p) => p.metodo === "PUT")!;
  expect(JSON.parse(put.corpo!)).toEqual({ language: "en" });
  // Salvo o mesmo valor, não há mais o que persistir.
  await expect(salvar(page)).toBeDisabled();
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// D · E · as duas trocas
// ══════════════════════════════════════════════════════════════════════════════════════════

test("D · en → pt: 1 PUT, e a interface passa a falar português sem recarregar", async ({ page }) => {
  const rede = await montarConta(page, { inicial: "en" });
  await page.goto(ROTA);

  await radio(page, /Portuguese/).click();
  await salvar(page).click();

  await expect(page.getByText(/Português é o idioma que você escolheu/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  expect(rede.puts()).toBe(1);
});

test("E · pt → en: termina em inglês SALVO, nunca em 'nunca escolheu'", async ({ page }) => {
  const rede = await montarConta(page, { inicial: "pt" });
  await page.goto(ROTA);

  await expect(page.getByText(/Português é o idioma que você escolheu/)).toBeVisible();
  await radio(page, /English/).click();
  await salvar(page).click();

  await expect(page.getByText(/English is your chosen language/)).toBeVisible();
  // A frase do padrão seria a prova de que voltou para `null` — e não existe CLEAR.
  await expect(page.getByText(/Using English, the default/)).toHaveCount(0);
  expect(rede.puts()).toBe(1);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F · G · H · de onde vem o idioma depois do bootstrap
// ══════════════════════════════════════════════════════════════════════════════════════════

test("F · refresh: o backend continua pt e a aplicação volta em pt", async ({ page }) => {
  await montarConta(page, { inicial: "pt" });
  await page.goto(ROTA);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
});

test("G · sessão nova, cache VAZIO: o idioma vem da conta", async ({ page }) => {
  await montarConta(page, { inicial: "pt", cacheLocal: undefined });
  await page.goto(ROTA);

  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(page.getByText(/Português é o idioma que você escolheu/)).toBeVisible();
});

test("H · localStorage pt × conta sem escolha: o BACKEND vence, e zero PUT", async ({ page }) => {
  const rede = await montarConta(page, { inicial: null, cacheLocal: "pt" });
  await page.goto(ROTA);

  // A escolha anônima do navegador não vira preferência da conta sem ato explícito.
  await expect(page.getByText(/Using English, the default/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.waitForTimeout(600);
  expect(rede.puts(), "o login migrou a escolha local para a conta").toBe(0);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// I · J · falhas
// ══════════════════════════════════════════════════════════════════════════════════════════

test("I · Account fora do ar: a tela vive, a identidade aparece, e nada vira 'sem preferência'", async ({
  page,
}) => {
  await montarConta(page, { idiomaIndisponivel: true });
  await page.goto(ROTA);

  await expect(page.getByText("Ana Ribeiro")).toBeVisible();
  await expect(page.getByText(/Couldn't load your language/)).toBeVisible();
  await expect(page.getByText(/Using English, the default/)).toHaveCount(0);
  await expect(page.getByText(/is your chosen language/)).toHaveCount(0);
});

test("J · o PUT falha: a tela NÃO afirma que salvou", async ({ page }) => {
  await montarConta(page, { inicial: "en", falharEscrita: true });
  await page.goto(ROTA);

  await radio(page, /Portuguese/).click();
  await salvar(page).click();

  await expect(page.getByText(/Couldn't save your language/)).toBeVisible();
  await expect(page.getByText(/Language saved/)).toHaveCount(0);
  // O estado confirmado não mudou: inglês continua sendo o que está salvo.
  await expect(page.getByText(/English is your chosen language/)).toBeVisible();
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// K · a forma da rede
// ══════════════════════════════════════════════════════════════════════════════════════════

test("K · o Front fala só com o Gateway, e o corpo tem um campo só", async ({ page }) => {
  const rede = await montarConta(page, { inicial: "en" });
  await page.goto(ROTA);
  await radio(page, /Portuguese/).click();
  await salvar(page).click();
  await expect(page.getByText(/Português é o idioma/)).toBeVisible();

  // Estas duas valem para TODA requisição da página: nenhuma tela pública fala com API interna.
  for (const p of rede.pedidos) {
    expect(p.url, "o Front chamou a API interna do Account").not.toContain("/internal/");
    expect(Object.keys(p.cabecalhos), "token interno no browser").not.toContain("x-internal-token");
  }

  // Estas três valem para as requisições de IDENTIDADE E IDIOMA — e o recorte é a correção de um
  // gate que envelheceu. Ele varria a página inteira afirmando que nenhuma requisição carrega
  // `workspace_id=`, e isso descrevia a página de 2026-08-14, quando o único dono ali era a
  // conta. A M44 pôs a comunicação do Workspace na mesma tela, e ela carrega `workspace_id` na
  // query por exigência do contrato — as quatro operações a exigem.
  //
  // O invariante da M41 nunca foi "ninguém nesta página usa escopo": era "a preferência de
  // idioma NÃO é particionada por workspace", e é isso que o recorte volta a medir. Um gate cujo
  // alcance é maior que sua afirmação vira falso positivo no dia em que a vizinhança muda.
  const daConta = rede.pedidos.filter((p) => new URL(p.url).pathname.startsWith("/v1/me"));
  expect(daConta.length, "nenhuma requisição de conta — o laço abaixo seria vazio")
    .toBeGreaterThan(0);
  for (const p of daConta) {
    expect(p.url, "a preferência de idioma foi particionada por workspace").not.toContain("workspace_id=");
    expect(p.url).not.toContain("instance_id=");
    expect(p.url).not.toContain("user_subject");
  }
  const put = rede.pedidos.find((p) => p.metodo === "PUT")!;
  expect(Object.keys(JSON.parse(put.corpo!)), "corpo com campo a mais").toEqual(["language"]);

  // O idioma não passa por Analytics, ARGOS nem result.
  const alheios = rede.pedidos.filter((p) => /analytics|result|progress|argos/i.test(p.url));
  expect(alheios.map((p) => p.url)).toEqual([]);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// L · M · N · teclado, responsivo, axe
// ══════════════════════════════════════════════════════════════════════════════════════════

test("K2 · dois cliques rápidos em Salvar emitem UM único PUT", async ({ page }) => {
  // O botão fica indisponível enquanto a escrita está em voo. Sem isso, dois cliques viram duas
  // escritas — e a segunda chega depois, podendo confirmar um estado que a pessoa já abandonou.
  const rede = await montarConta(page, { inicial: "en" });
  await page.goto(ROTA);
  await radio(page, /Portuguese/).click();

  await salvar(page).click();
  await salvar(page)
    .click({ force: true, timeout: 2000 })
    .catch(() => {
      // Clique recusado porque o botão está desabilitado — que é exatamente a defesa sob teste.
    });

  await expect(page.getByText(/Português é o idioma/)).toBeVisible();
  expect(rede.puts(), "double submit passou").toBe(1);
});

test("L · dá para escolher e salvar só com o teclado", async ({ page }) => {
  const rede = await montarConta(page, { inicial: "en" });
  await page.goto(ROTA);

  await radio(page, /English/).focus();
  await page.keyboard.press("ArrowDown"); // rádio: seta move a seleção
  await expect(radio(page, /Portuguese/)).toBeChecked();

  await page.keyboard.press("Tab");
  await expect(salvar(page)).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/Português é o idioma/)).toBeVisible();
  expect(rede.puts()).toBe(1);
});

for (const vp of VIEWPORTS) {
  test(`M · ${vp.nome}: sem overflow horizontal`, async ({ page }) => {
    await montarConta(page, { inicial: null });
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(ROTA);
    await expect(salvar(page)).toBeVisible();

    const estoura = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(estoura, `${vp.nome} rola na horizontal`).toBe(false);
  });
}

test("N · axe: zero violação na tela da conta", async ({ page }) => {
  await montarConta(page, { inicial: null });
  await page.goto(ROTA);
  await expect(salvar(page)).toBeVisible();

  // Mesmo caminho das outras specs: `axe-core` injetado na página, sem dependência nova.
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const violacoes = await page.evaluate(async () => {
    const r = await (
      window as unknown as {
        axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> };
      }
    ).axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
  });
  expect(violacoes, "violações de acessibilidade na tela da conta").toEqual([]);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// O · P · o idioma provado pelo CONTEÚDO renderizado
// ══════════════════════════════════════════════════════════════════════════════════════════

test("O · com a conta em pt, a tela mostra copy em PORTUGUÊS", async ({ page }) => {
  await montarConta(page, { inicial: "pt" });
  await page.goto(ROTA);

  // Frases que só existem em `pt.json`. Nome de arquivo não prova idioma; texto na tela prova.
  await expect(page.getByRole("heading", { name: "Conta", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seus dados", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar idioma" })).toBeVisible();
});

test("P · com a conta em en, a tela mostra copy em INGLÊS", async ({ page }) => {
  await montarConta(page, { inicial: "en" });
  await page.goto(ROTA);

  await expect(page.getByRole("heading", { name: "Account", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save language" })).toBeVisible();
});
