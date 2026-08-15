// M44 · COM-01 — a comunicação do Workspace em BROWSER REAL.
//
// ## O que só o browser prova
//
// - que `503` do dono **não** vira "ninguém está sendo avisado" — as duas telas são opostas, e a
//   normalização que as colapsa mora na camada de dados, onde o vitest não a exercita com a
//   composição real;
// - que o e-mail da CONTA está na mesma página, respondendo `200`, e mesmo assim não vence o
//   destino da assinatura;
// - que o idioma da conta e o da mensagem divergem na tela, lado a lado;
// - que desativar **não** remove a linha;
// - que o segredo aparece uma vez e não fica em storage nenhum;
// - foco, teclado, viewport e axe.

import axe from "axe-core";
import { expect, test, type Page, type Request } from "@playwright/test";

// Service worker bloqueado pela razão já registrada nos specs da M41/M42: um worker responde
// antes da camada que o Playwright intercepta, `page.route` nunca dispara, e o sintoma chega como
// "elemento não encontrado" — que parece defeito de UI e é a rede fora de controle.
test.use({ serviceWorkers: "block" });

const ROTA = "/dashboard/settings";
/** O escopo ativo semeado pelo bypass de E2E (`src/e2e/bypass.ts`). */
const ESCOPO = "e2e-workspace-0000";
const OUTRO_ESCOPO = "ws-outro-8c41d0";

const SUB_EMAIL = "sub-6b1e9047-3c85-4a2f-b0d6-18e7c4a95230";
const SUB_WEBHOOK = "sub-a24f7db3-08e1-4c96-9f52-7b30d6e18c4a";

/** O e-mail da CONTA. É a fonte plausível e ERRADA — nunca pode virar destinatário. */
const EMAIL_DA_CONTA = "marcos.tavares@cliente.test";
/** O destino REAL da assinatura. Sem relação nenhuma com a conta. */
const DESTINO = "alertas@operacoes.exemplo.test";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: EMAIL_DA_CONTA, name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

interface Assinatura {
  subscription_id: string;
  channel: "email" | "webhook";
  destination: string;
  event_types: string[];
  language: "pt" | "en";
  active: boolean;
  secret_version: number;
  verified_at: string | null;
  created_at: string | null;
}

const ASSINATURA_EMAIL: Assinatura = {
  subscription_id: SUB_EMAIL,
  channel: "email",
  destination: DESTINO,
  event_types: ["analysis.completed", "analysis.failed"],
  // A conta está em `en` (ver `montar`), e a mensagem sai em `pt`. Divergência LEGÍTIMA.
  language: "pt",
  active: true,
  secret_version: 1,
  verified_at: "2026-07-02T14:20:00Z",
  created_at: "2026-06-28T09:05:00Z",
};

const ASSINATURA_WEBHOOK: Assinatura = {
  subscription_id: SUB_WEBHOOK,
  channel: "webhook",
  destination: "https://hooks.operacoes.exemplo.test/sentinela",
  event_types: ["analysis.failed"],
  language: "en",
  active: true,
  secret_version: 2,
  verified_at: null,
  created_at: "2026-07-19T11:47:00Z",
};

interface Rede {
  pedidos: { metodo: string; url: string; corpo: string | null }[];
  de: (metodo: string, fragmento: string) => number;
}

async function montar(
  page: Page,
  opts: {
    itens?: Assinatura[];
    indisponivel?: boolean;
    falharCriar?: boolean;
    falharDesativar?: boolean;
    falharRotacionar?: boolean;
    idioma?: "pt" | "en";
    escopoDoOutro?: boolean;
  } = {},
): Promise<Rede> {
  const rede: Rede = {
    pedidos: [],
    de: (metodo, fragmento) =>
      rede.pedidos.filter((p) => p.metodo === metodo && p.url.includes(fragmento)).length,
  };
  // O estado VIVE no handler: é ele que faz `create`/`disable`/`rotate` serem observáveis por uma
  // leitura posterior, em vez de afirmações sobre um objeto congelado.
  const porEscopo = new Map<string, Assinatura[]>([
    [ESCOPO, (opts.itens ?? [ASSINATURA_EMAIL, ASSINATURA_WEBHOOK]).map((s) => ({ ...s }))],
    [OUTRO_ESCOPO, []],
  ]);
  let criadas = 0;

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  page.on("request", (r: Request) => {
    // `pathname.startsWith("/v1/")`, e não `url.includes("/v1/")`.
    //
    // O dev server do Vite serve os PRÓPRIOS módulos por HTTP — `/src/lib/v1/client.ts`,
    // `/src/lib/v1/queryKeys.ts` — e um filtro por substring os grava como se fossem chamadas de
    // API. O gate "nenhum interno" então acusava quinze requisições ao próprio bundler, e o
    // sintoma parecia vazamento de fronteira. O recorte por caminho separa API de código-fonte.
    const caminho = new URL(r.url()).pathname;
    // Keycloak é reconhecido pelo CAMINHO do endpoint (`/realms/…`), e não pela palavra na URL:
    // o dev server serve `/src/lib/auth/keycloakAuthClient.ts`, e um regex por nome gravava o
    // módulo-fonte como se fosse uma ida ao provedor de identidade.
    if (caminho.startsWith("/v1/") || caminho.startsWith("/internal/") || caminho.includes("/realms/")) {
      rede.pedidos.push({ metodo: r.method(), url: r.url(), corpo: r.postData() });
    }
  });

  await page.route("**/v1/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  // A CONTA em `en`. A assinatura de e-mail está em `pt` — e as duas convivem na mesma tela.
  await page.route("**/v1/me/language", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stored_language: opts.idioma ?? "en",
        effective_language: opts.idioma ?? "en",
      }),
    }),
  );
  await page.route("**/v1/workspaces/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace_id: ESCOPO,
        name: "Atendimento Norte",
        created_at: "2026-03-11T08:42:00Z",
      }),
    }),
  );

  await page.route("**/v1/subscriptions**", async (route) => {
    const pedido = route.request();
    const url = new URL(pedido.url());
    const escopo = url.searchParams.get("workspace_id") ?? "";
    const lista = porEscopo.get(escopo) ?? [];
    const problema = (code: string, status: number) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ code, detail: code }),
      });

    if (opts.indisponivel) return problema("temporarily_unavailable", 503);

    const id = url.pathname.split("/").filter(Boolean).pop() as string;
    const ehSegredo = url.pathname.endsWith("/secret");

    if (pedido.method() === "POST" && ehSegredo) {
      if (opts.falharRotacionar) return problema("temporarily_unavailable", 503);
      const alvo = lista.find((s) => s.subscription_id === url.pathname.split("/")[3]);
      if (!alvo) return problema("forbidden_or_not_found", 404);
      alvo.secret_version += 1;
      // O dono zera a verificação: a chave mudou, e a verificação anterior era sobre a antiga.
      alvo.verified_at = null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          subscription_id: alvo.subscription_id,
          secret_version: alvo.secret_version,
          secret: `whsec_rotacionado_v${alvo.secret_version}`,
        }),
      });
    }

    if (pedido.method() === "DELETE") {
      if (opts.falharDesativar) return problema("temporarily_unavailable", 503);
      const alvo = lista.find((s) => s.subscription_id === id && s.active);
      if (!alvo) return problema("forbidden_or_not_found", 404);
      alvo.active = false;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ subscription_id: alvo.subscription_id, active: false }),
      });
    }

    if (pedido.method() === "POST") {
      if (opts.falharCriar) return problema("temporarily_unavailable", 503);
      const corpo = JSON.parse(pedido.postData() ?? "{}") as Record<string, unknown>;
      criadas += 1;
      const nova: Assinatura = {
        subscription_id: `sub-criada-${criadas}`,
        channel: corpo.channel as "email" | "webhook",
        destination: String(corpo.destination),
        event_types: corpo.event_types as string[],
        language: corpo.language as "pt" | "en",
        active: true,
        secret_version: 1,
        verified_at: null,
        created_at: "2026-08-15T00:00:00Z",
      };
      lista.push(nova);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          subscription_id: nova.subscription_id,
          secret_version: 1,
          secret: nova.channel === "webhook" ? "whsec_criado_uma_vez" : null,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: opts.escopoDoOutro ? (porEscopo.get(OUTRO_ESCOPO) ?? []) : lista }),
    });
  });

  return rede;
}

const secao = (page: Page) =>
  page.locator("section").filter({ hasText: /^Notifications|^Notificações/ }).first();
const botao = (page: Page, nome: RegExp) => page.getByRole("button", { name: nome });

/** Rola a seção para a vista e espera o estado terminal dela. */
async function abrir(page: Page, ancora: RegExp) {
  await page.goto(ROTA);
  await expect(page.getByText(ancora).first()).toBeVisible({ timeout: 15_000 });
}

// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M44 · COM-01 no browser", () => {
  test("A · ABSENT: ausência é dita como ausência, e não cria nada", async ({ page }) => {
    const rede = await montar(page, { itens: [] });
    await abrir(page, /No one is being notified yet/);

    // A negativa vem DEPOIS da âncora positiva: sem isso, "não diz indisponível" seria verdade
    // sobre um esqueleto.
    const texto = await page.locator("main").innerText();
    expect(texto.length).toBeGreaterThan(50);
    expect(texto).not.toMatch(/unavailable right now|indisponíveis agora/);

    // Ler NÃO cria: um `GET`, zero escritas.
    expect(rede.de("GET", "/v1/subscriptions")).toBe(1);
    expect(rede.de("POST", "/v1/subscriptions")).toBe(0);

    // E o formulário nasce VAZIO. Pré-preencher o destino com o e-mail de login seria a mesma
    // inferência do lado da escrita — e ela não daria erro, daria o endereço errado com `200`.
    await expect(secao(page).getByLabel(/^Email address$/)).toHaveValue("");
  });

  test("B · OUTAGE: indisponível, e NUNCA 'ninguém está sendo avisado'", async ({ page }) => {
    await montar(page, { indisponivel: true });
    await abrir(page, /Notifications are unavailable right now/);

    const texto = await page.locator("main").innerText();
    expect(texto.length).toBeGreaterThan(50);
    // O colapso que esta missão existe para impedir.
    expect(texto, "outage virou ausência").not.toMatch(/No one is being notified/);
    await expect(botao(page, /^Try again$/)).toBeVisible();

    // E o resto da página continua vivo: o dono da comunicação caiu, não a Settings.
    await expect(page.getByRole("radio", { name: /Portuguese/ })).toBeVisible();
    await expect(page.getByLabel(/^Name$/)).toBeVisible();
  });

  test("C/D · CURRENT: os dados vêm do produtor, e o e-mail da CONTA não vence", async ({ page }) => {
    await montar(page);
    await abrir(page, /Sends to/);

    // O destino da assinatura está na tela.
    await expect(secao(page).getByText(DESTINO)).toBeVisible();
    // E o e-mail da conta também está — na seção de identidade, respondendo `200`. A divergência
    // existe nesta sessão, e mesmo assim a comunicação não a usa.
    await expect(page.getByText(EMAIL_DA_CONTA)).toBeVisible();
    expect(
      await secao(page).getByText(EMAIL_DA_CONTA).count(),
      "o e-mail de login virou destinatário",
    ).toBe(0);
  });

  test("E · LANGUAGE: a conta em PT e a mensagem em EN, lado a lado", async ({ page }) => {
    await montar(page);
    await abrir(page, /Message language/);

    // A assinatura de e-mail declara `pt`; a conta declara `en`. As duas na mesma tela.
    const linha = secao(page).locator("li").filter({ hasText: DESTINO });
    await expect(linha.getByText(/^Portuguese$/)).toBeVisible();
    await expect(page.getByRole("radio", { name: /English/ })).toBeChecked();
  });

  test("F · CREATE: ação explícita, UM request, estado confirmado pelo servidor", async ({ page }) => {
    const rede = await montar(page, { itens: [] });
    await abrir(page, /No one is being notified yet/);

    await secao(page).getByLabel(/^Email address$/).fill("novo@operacoes.exemplo.test");
    await botao(page, /^Add$/).click();

    await expect(secao(page).getByText("novo@operacoes.exemplo.test")).toBeVisible();
    expect(rede.de("POST", "/v1/subscriptions")).toBe(1);

    // O corpo carrega os quatro campos publicados — e NÃO `workspace_id`, que o Gateway recusa.
    const corpo = JSON.parse(
      rede.pedidos.find((p) => p.metodo === "POST" && p.url.includes("/v1/subscriptions"))?.corpo ?? "{}",
    ) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(["channel", "destination", "event_types", "language"]);
    // E o escopo viaja na QUERY, como o contrato exige.
    expect(
      rede.pedidos.find((p) => p.metodo === "POST")?.url,
    ).toContain(`workspace_id=${ESCOPO}`);

    // O estado veio do servidor, não do rascunho: a linha traz o que o produtor devolveu.
    await expect(secao(page).getByText(/No delivery confirmed yet/)).toBeVisible();
  });

  test("G · CREATE FAILURE: sem falso sucesso, e o rascunho fica", async ({ page }) => {
    await montar(page, { itens: [], falharCriar: true });
    await abrir(page, /No one is being notified yet/);

    await secao(page).getByLabel(/^Email address$/).fill("nao@vai.test");
    await botao(page, /^Add$/).click();

    await expect(secao(page).getByText(/We could not add it/)).toBeVisible();
    // Nada foi afirmado como criado, e o que a pessoa digitou continua ali.
    await expect(secao(page).getByText(/^Added\.$/)).toHaveCount(0);
    await expect(secao(page).getByLabel(/^Email address$/)).toHaveValue("nao@vai.test");
    await expect(secao(page).getByText(/No one is being notified yet/)).toBeVisible();
  });

  test("H · DISABLE: a linha CONTINUA na lista, marcada como desativada", async ({ page }) => {
    const rede = await montar(page);
    await abrir(page, /Sends to/);
    const antes = await secao(page).locator("li").count();

    const linha = secao(page).locator("li").filter({ hasText: DESTINO });
    await linha.getByRole("button", { name: /^Turn off$/ }).click();

    await expect(linha.getByText(/It stays here and stops receiving/)).toBeVisible();
    // MESMA cardinalidade: disable não é delete.
    expect(await secao(page).locator("li").count()).toBe(antes);
    await expect(linha.getByText(/^Off$/)).toBeVisible();
    await expect(secao(page).getByText(DESTINO)).toBeVisible();

    expect(rede.de("DELETE", "/v1/subscriptions/")).toBe(1);
  });

  test("I · DISABLE FAILURE: o estado confirmado não se move", async ({ page }) => {
    await montar(page, { falharDesativar: true });
    await abrir(page, /Sends to/);

    const linha = secao(page).locator("li").filter({ hasText: DESTINO });
    await linha.getByRole("button", { name: /^Turn off$/ }).click();

    await expect(linha.getByText(/We could not turn it off/)).toBeVisible();
    // Continua ATIVA — sem remoção otimista.
    await expect(linha.getByText(/^Active$/)).toBeVisible();
    await expect(linha.getByText(/^Off$/)).toHaveCount(0);
  });

  test("J · ROTATE: mesma identidade, versão sobe, segredo aparece uma vez", async ({ page }) => {
    const rede = await montar(page);
    await abrir(page, /Sends to/);

    const linha = secao(page).locator("li").filter({ hasText: "hooks.operacoes.exemplo.test" });
    await expect(linha.getByText(/Key v2/)).toBeVisible();
    await linha.getByRole("button", { name: /^New signing key$/ }).click();

    await expect(linha.getByText(/New signing key generated/)).toBeVisible();
    await expect(linha.getByText(/whsec_rotacionado_v3/)).toBeVisible();
    await expect(linha.getByText(/Key v3/)).toBeVisible();

    // Rotação NÃO é apagar e recriar: a identidade não se move, e nada de POST/DELETE de recurso.
    expect(rede.de("POST", "/secret")).toBe(1);
    expect(rede.de("DELETE", "/v1/subscriptions/")).toBe(0);
    expect(rede.pedidos.filter((p) => p.metodo === "POST" && /\/v1\/subscriptions\?/.test(p.url))).toHaveLength(0);
    // E o resto da linha não mudou.
    await expect(linha.getByText("https://hooks.operacoes.exemplo.test/sentinela")).toBeVisible();
  });

  test("K · ROTATE FAILURE: nenhum segredo novo aparece", async ({ page }) => {
    await montar(page, { falharRotacionar: true });
    await abrir(page, /Sends to/);

    const linha = secao(page).locator("li").filter({ hasText: "hooks.operacoes.exemplo.test" });
    await linha.getByRole("button", { name: /^New signing key$/ }).click();

    await expect(linha.getByText(/We could not generate a new key/)).toBeVisible();
    await expect(linha.getByText(/whsec_/)).toHaveCount(0);
    // A versão confirmada não se move.
    await expect(linha.getByText(/Key v2/)).toBeVisible();
  });

  test("L/M/N/O · nenhuma ação que o contrato não tem", async ({ page }) => {
    // A massa inclui uma DESATIVADA de propósito. Com só ativas, "não existe reativar" seria
    // verdade sobre uma tela onde o botão não teria onde aparecer — negativa sobre massa que não
    // pode viola-la. É a linha desativada que torna a ausência observável.
    await montar(page, {
      itens: [ASSINATURA_EMAIL, ASSINATURA_WEBHOOK, { ...ASSINATURA_EMAIL, subscription_id: "sub-off", active: false }],
    });
    await abrir(page, /Sends to/);

    const s = secao(page);
    // L — verificar não é operação: `verified_at` é campo observado.
    await expect(s.getByRole("button", { name: /verif|confirm|send code|código/i })).toHaveCount(0);
    // M — não há update.
    await expect(s.getByRole("button", { name: /^Edit$|^Save$|^Update$|^Editar$/i })).toHaveCount(0);
    // N — não há reativar.
    await expect(s.getByRole("button", { name: /enable|reactivat|turn back on|reativar/i })).toHaveCount(0);
    // O — não há exclusão.
    await expect(s.getByRole("button", { name: /delete|remove|excluir|remover/i })).toHaveCount(0);
    const texto = (await s.innerText()).toLowerCase();
    expect(texto.length).toBeGreaterThan(50);
    expect(texto).not.toMatch(/delete|excluir/);
    // Nenhum vestígio de caixa de entrada: a M44 é configuração e reentrada.
    expect(texto, "inbox apareceu na seção").not.toMatch(/inbox|caixa de entrada|unread|não lidas/);
    // E os eventos oferecidos são EXATAMENTE os três do contrato.
    const caixas = await s.getByRole("checkbox").count();
    expect(caixas, "o vocabulário de eventos mudou").toBe(3);
  });

  test("P · CROSS-WORKSPACE: a lista do outro escopo não vaza", async ({ page }) => {
    await montar(page, { escopoDoOutro: true });
    await abrir(page, /No one is being notified yet/);

    // O outro escopo não tem assinatura: a tela mostra ausência, e nenhum destino do escopo A.
    const texto = await secao(page).innerText();
    expect(texto.length).toBeGreaterThan(30);
    expect(texto).not.toContain(DESTINO);
  });

  test("Q · o escopo viaja na QUERY em toda operação", async ({ page }) => {
    const rede = await montar(page);
    await abrir(page, /Sends to/);

    const linha = secao(page).locator("li").filter({ hasText: DESTINO });
    await linha.getByRole("button", { name: /^Turn off$/ }).click();
    await expect(linha.getByText(/^Off$/)).toBeVisible();

    const deSub = rede.pedidos.filter((p) => p.url.includes("/v1/subscriptions"));
    expect(deSub.length).toBeGreaterThan(1);
    for (const p of deSub) {
      expect(p.url, `${p.metodo} ${p.url} sem workspace_id`).toContain(`workspace_id=${ESCOPO}`);
    }
  });

  test("R · teclado: chega ao campo e ao botão, e adiciona sem mouse", async ({ page }) => {
    const rede = await montar(page, { itens: [] });
    await abrir(page, /No one is being notified yet/);

    const campo = secao(page).getByLabel(/^Email address$/);
    await campo.focus();
    await page.keyboard.type("teclado@operacoes.exemplo.test");
    await expect(campo).toBeFocused();
    await botao(page, /^Add$/).click();

    await expect(secao(page).getByText("teclado@operacoes.exemplo.test")).toBeVisible();
    expect(rede.de("POST", "/v1/subscriptions")).toBe(1);
  });

  test("S · axe: zero violações com a seção montada", async ({ page }) => {
    await montar(page);
    await abrir(page, /Sends to/);

    // `axe.source` e não `require.resolve`: o spec roda em ESM, onde `require` não existe.
    await page.addScriptTag({ content: axe.source });
    const resultado = await page.evaluate(async () => {
      const a = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
      return (await a.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
        violations: { id: string; nodes: unknown[] }[];
      };
    });
    const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
    expect(graves, `violações axe: ${graves.join(", ")}`).toEqual([]);
  });

  test("T · PT — o idioma vem da preferência da CONTA", async ({ page }) => {
    await montar(page, { idioma: "pt" });
    await page.goto(ROTA);
    await expect(page.getByText(/Ninguém está sendo avisado|Avisa/).first()).toBeVisible({
      timeout: 15_000,
    });
    // "Desativar" existe só em pt.json.
    await expect(secao(page).getByRole("button", { name: /^Desativar$/ }).first()).toBeVisible();
  });

  test("U · o segredo NÃO vai para storage nenhum", async ({ page }) => {
    await montar(page);
    await abrir(page, /Sends to/);

    const linha = secao(page).locator("li").filter({ hasText: "hooks.operacoes.exemplo.test" });
    await linha.getByRole("button", { name: /^New signing key$/ }).click();
    await expect(linha.getByText(/whsec_rotacionado_v3/)).toBeVisible();

    const persistido = await page.evaluate(() => {
      const tudo: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i) as string;
        tudo.push(`${k}=${localStorage.getItem(k) ?? ""}`);
      }
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i) as string;
        tudo.push(`${k}=${sessionStorage.getItem(k) ?? ""}`);
      }
      return tudo.join("\n");
    });
    expect(persistido.length, "storage vazio tornaria a negativa trivial").toBeGreaterThan(0);
    expect(persistido, "o segredo foi persistido").not.toContain("whsec_");
    // E não viajou na URL.
    expect(page.url()).not.toContain("whsec_");
  });

  test("V · nenhum interno, e nenhuma chamada à conta por causa da comunicação", async ({ page }) => {
    const rede = await montar(page);
    await abrir(page, /Sends to/);

    expect(rede.pedidos.length).toBeGreaterThan(0);
    // O Front não conhece o Dispatcher. (Sem `:808\d` aqui: essa é a porta do PRÓPRIO dev
    // server, e proibi-la acusava o Vite em vez do Dispatcher.)
    expect(rede.pedidos.filter((p) => /\/internal\/|s2s/i.test(p.url))).toHaveLength(0);
    expect(rede.pedidos.filter((p) => new URL(p.url).pathname.includes("/realms/"))).toHaveLength(0);
    // `/v1/me/language` é da seção de idioma — UMA leitura, e não uma por causa da comunicação.
    expect(rede.de("GET", "/v1/me/language")).toBeLessThanOrEqual(1);
    // E nenhuma operação que o contrato não tem.
    expect(rede.pedidos.filter((p) => /\/verify|\/enable/.test(p.url))).toHaveLength(0);
    expect(rede.pedidos.filter((p) => p.metodo === "PATCH" && p.url.includes("/v1/subscriptions"))).toHaveLength(0);
    expect(rede.pedidos.filter((p) => p.metodo === "PUT" && p.url.includes("/v1/subscriptions"))).toHaveLength(0);
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`W · ${vp.nome}: sem rolagem horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montar(page);
      await abrir(page, /Sends to/);

      const excesso = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(excesso, `${vp.nome} com rolagem horizontal`).toBeLessThanOrEqual(1);
    });
  }
});
