// M44 — as capturas reais de COM-01 e COM-02.
//
// ## O provador é compartilhado, e não há exceção
//
// A M42 publicou uma captura de "instance unavailable" que era um esqueleto cinza, e ela era a
// ÚNICA das treze que não passava pela função de prova — justamente porque não tinha conteúdo que
// provasse idioma. O desvio era o sintoma, e foi tratado como exceção aceitável.
//
// Aqui `capturar` é o único caminho: toda imagem afirma, ANTES de disparar, (1) uma âncora
// positiva do estado terminal e (2) uma frase que só existe naquele locale. Se um estado não tem
// como provar idioma pelo caminho feliz, ele passa a âncora dele — nunca escapa do provador.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const ROTA = "/dashboard/settings";
const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";
const DESTINO = "alertas@operacoes.exemplo.test";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
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

const EMAIL_ATIVA: Assinatura = {
  subscription_id: "sub-6b1e9047-3c85-4a2f-b0d6-18e7c4a95230",
  channel: "email",
  destination: DESTINO,
  event_types: ["analysis.completed", "analysis.failed"],
  language: "pt",
  active: true,
  secret_version: 1,
  verified_at: "2026-07-02T14:20:00Z",
  created_at: "2026-06-28T09:05:00Z",
};

const WEBHOOK_ATIVA: Assinatura = {
  subscription_id: "sub-a24f7db3-08e1-4c96-9f52-7b30d6e18c4a",
  channel: "webhook",
  destination: "https://hooks.operacoes.exemplo.test/sentinela",
  event_types: ["analysis.failed"],
  language: "en",
  active: true,
  secret_version: 2,
  verified_at: null,
  created_at: "2026-07-19T11:47:00Z",
};

const DESATIVADA: Assinatura = { ...EMAIL_ATIVA, subscription_id: "sub-off", active: false };

async function montar(
  page: Page,
  opts: { itens?: Assinatura[]; indisponivel?: boolean; idioma?: "pt" | "en" } = {},
) {
  const itens = (opts.itens ?? [EMAIL_ATIVA, WEBHOOK_ATIVA]).map((s) => ({ ...s }));

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  await page.route("**/v1/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.route("**/v1/me/language", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stored_language: opts.idioma ?? "en",
        effective_language: opts.idioma ?? "en",
      }),
    }),
  );
  await page.route("**/v1/workspaces/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace_id: ESCOPO,
        name: "Atendimento Norte",
        created_at: "2026-03-11T08:42:00Z",
      }),
    }),
  );
  // A lista ANTES do detalhe: o Playwright casa a última registrada primeiro.
  await page.route("**/v1/analyses**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/v1/analyses/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis_id: ANALISE,
        status: "completed",
        record_count: 1240,
        result_available: true,
        retry_allowed: false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    }),
  );
  await page.route("**/v1/subscriptions**", async (route) => {
    if (opts.indisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable" }),
      });
    }
    const pedido = route.request();
    if (pedido.method() === "POST" && pedido.url().includes("/secret")) {
      const alvo = itens.find((s) => s.channel === "webhook") as Assinatura;
      alvo.secret_version += 1;
      alvo.verified_at = null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          subscription_id: alvo.subscription_id,
          secret_version: alvo.secret_version,
          secret: "whsec_9f13c04b7ae2",
        }),
      });
    }
    if (pedido.method() === "POST") {
      const corpo = JSON.parse(pedido.postData() ?? "{}") as Record<string, unknown>;
      itens.push({
        subscription_id: "sub-criada-1",
        channel: corpo.channel as "email" | "webhook",
        destination: String(corpo.destination),
        event_types: corpo.event_types as string[],
        language: corpo.language as "pt" | "en",
        active: true,
        secret_version: 1,
        verified_at: null,
        created_at: "2026-08-15T00:00:00Z",
      });
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ subscription_id: "sub-criada-1", secret_version: 1, secret: null }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: itens }),
    });
  });
}

/** Frases que existem em UM locale só. É por elas que a captura prova o idioma. */
const MARCA = { en: /^Add$/, pt: /^Adicionar$/ } as const;

/**
 * Captura DEPOIS de provar (1) o estado terminal e (2) o idioma pelo conteúdo renderizado.
 *
 * `fullPage` NÃO basta: o scroll desta aplicação é de um container interno do `AppShell`, não do
 * documento. Sem rolar o alvo para a vista, a imagem sai com a seção cortada no título — treze
 * capturas da M42 já saíram assim.
 */
async function capturar(
  page: Page,
  nome: string,
  idioma: "pt" | "en",
  ancora: RegExp,
  marca: RegExp = MARCA[idioma],
) {
  await expect(
    page.locator("main").getByText(ancora).first(),
    `a captura ${nome} precisa do estado terminal antes de disparar`,
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator("main").getByRole("button", { name: marca }).first(),
    `a captura ${nome} diz ser ${idioma} — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.locator("main").getByText(ancora).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `docs/m44/${nome}.png`, fullPage: true });
}

const secao = (page: Page) =>
  page.locator("section").filter({ hasText: /^Notifications|^Notificações/ }).first();

test.describe("M44 · capturas", () => {
  test("01 · ausência", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await montar(page, { itens: [] });
    await page.goto(ROTA);
    await capturar(page, "01-desktop-absent-en", "en", /No one is being notified yet/);
  });

  test("02 · corrente, com destino e idioma divergentes da conta", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await montar(page);
    await page.goto(ROTA);
    // A divergência ASSERIDA antes do disparo: o destino não é o e-mail da conta, e a mensagem
    // sai em português enquanto a interface está em inglês.
    await expect(secao(page).getByText(DESTINO)).toBeVisible({ timeout: 15_000 });
    // Escopado à LINHA: "Portuguese" aparece duas vezes na seção — no idioma desta assinatura e
    // como opção do formulário de adicionar. Sem o recorte, a asserção casa a opção do `select`
    // e a prova de divergência passaria sem olhar para a assinatura.
    await expect(
      secao(page).locator("li").filter({ hasText: DESTINO }).getByText(/^Portuguese$/),
    ).toBeVisible();
    await expect(page.getByText("marcos.tavares@cliente.test")).toBeVisible();
    await capturar(page, "02-desktop-current-en", "en", /Sends to/);
  });

  test("03 · indisponível", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await montar(page, { indisponivel: true });
    await page.goto(ROTA);
    // O estado indisponível não tem o botão "Add" — a prova de idioma usa a âncora que ELE tem.
    await capturar(
      page,
      "03-desktop-unavailable-en",
      "en",
      /Notifications are unavailable right now/,
      /^Try again$/,
    );
  });

  test("04 · desativada — continua na lista", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await montar(page, { itens: [DESATIVADA] });
    await page.goto(ROTA);
    await capturar(page, "04-desktop-disabled-en", "en", /It stays here and stops receiving/);
  });

  test("05 · criada", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await montar(page, { itens: [] });
    await page.goto(ROTA);
    await secao(page).getByLabel(/^Email address$/).fill("plantao@operacoes.exemplo.test");
    await page.getByRole("button", { name: /^Add$/ }).click();
    await expect(secao(page).getByText("plantao@operacoes.exemplo.test")).toBeVisible();
    await capturar(page, "05-desktop-created-en", "en", /plantao@operacoes\.exemplo\.test/);
  });

  test("06 · chave rotacionada, visível uma vez", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await montar(page);
    await page.goto(ROTA);
    const linha = secao(page).locator("li").filter({ hasText: "hooks.operacoes" });
    await linha.getByRole("button", { name: /^New signing key$/ }).click();
    await expect(linha.getByText(/whsec_9f13c04b7ae2/)).toBeVisible();
    await capturar(page, "06-desktop-rotated-en", "en", /New signing key generated/);
  });

  test("07 · tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await montar(page);
    await page.goto(ROTA);
    await capturar(page, "07-tablet-current-en", "en", /Sends to/);
  });

  test("08 · mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await montar(page);
    await page.goto(ROTA);
    await capturar(page, "08-mobile-current-en", "en", /Sends to/);
  });

  test("09 · PT", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await montar(page, { idioma: "pt" });
    await page.goto(ROTA);
    await capturar(page, "09-desktop-current-pt", "pt", /Avisa/);
  });

  test("10 · reentrada — o link abre a Analysis", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page);
    await page.goto(`/analyses/${ANALISE}`);
    // Aqui não há botão "Add": esta é a superfície da Analysis. A âncora é o estado terminal
    // dela, e a prova de idioma é a mesma frase — que só existe em `en.json`.
    await expect(page.locator("main")).toContainText(/Analysis completed/, { timeout: 15_000 });
    expect(page.url()).toContain(`/analyses/${ANALISE}`);
    expect(page.url()).not.toContain("/result");
    await page.screenshot({ path: "docs/m44/10-desktop-reentry-en.png", fullPage: true });
  });
});
