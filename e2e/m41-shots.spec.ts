// M41 — as capturas da conta, com PROVA DE IDIOMA pelo conteúdo.
//
// ## Por que a prova é asserção, e não nome de arquivo
//
// A M40 declarou 12 capturas "PT e EN" e as 12 saíram em inglês: a spec escrevia
// `sentinela.language` e a chave real é `sentinela:language`, então o `setItem` não teve efeito e
// ninguém percebeu — o nome do arquivo dizia `pt`, e nome de arquivo não é evidência.
//
// Aqui cada captura declarada PT **falha** se a tela não tiver copy em português, e cada EN falha
// se não tiver copy em inglês. E o idioma não vem de `localStorage`: vem da CONTA, que é a
// autoridade desde a M41 — o cache nem é semeado.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const ROTA = "/dashboard/settings";
const PASTA = "docs/m41";

const IDENTIDADE = {
  user: { id: "u-kc-4417", email: "ana.ribeiro@cliente.test", name: "Ana Ribeiro" },
  workspaces: [
    { id: "ws-acme", name: "Acme", role: "owner" },
    { id: "ws-acme-lab", name: "Acme · Laboratório", role: "member" },
  ],
  capabilities: { canonical_analysis_enabled: true },
};

/** Frases que só existem num dos locales. É por elas que a captura prova o idioma. */
const MARCA = {
  pt: /Salvar idioma|Seus dados|Idioma da interface/,
  en: /Save language|Your details|Interface language/,
} as const;

async function montar(
  page: Page,
  opts: { inicial?: "en" | "pt" | null; indisponivel?: boolean; falharEscrita?: boolean; lento?: boolean } = {},
) {
  let guardado = opts.inicial ?? null;
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    window.localStorage.removeItem("sentinela:language");
  });
  await page.route("**/v1/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  // M45.4 — as seções VIZINHAS de Settings precisam existir no estado normal.
  //
  // Estas capturas documentam CFG-01/CFG-02 (conta e idioma). Desde a M42 e a M44, a mesma página
  // ganhou Workspace e Notificações — e esta spec não as servia, então elas apareciam em erro
  // dentro de uma captura que documenta outra coisa. Achado da M45.4, quando a suíte completa
  // reescreveu as imagens e a divergência ficou visível.
  await page.route("**/v1/subscriptions**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  );
  await page.route("**/v1/workspaces/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace_id: "e2e-workspace-0000",
        name: "Acme",
        created_at: "2026-03-11T08:42:00Z",
      }),
    }),
  );
  await page.route("**/v1/me/language", async (r) => {
    if (opts.indisponivel) {
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable" }),
      });
    }
    if (r.request().method() === "PUT") {
      if (opts.lento) await new Promise((ok) => setTimeout(ok, 4000));
      if (opts.falharEscrita) {
        return r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ code: "temporarily_unavailable" }),
        });
      }
      guardado = (JSON.parse(r.request().postData() ?? "{}") as { language?: "en" | "pt" }).language ?? guardado;
    }
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stored_language: guardado, effective_language: guardado ?? "en" }),
    });
  });
}

/** Captura e PROVA o idioma declarado no nome. Sem a prova, o arquivo é só um arquivo. */
async function capturar(page: Page, nome: string, idioma: "pt" | "en") {
  await expect(page.getByText(MARCA[idioma]).first(), `${nome} não está em ${idioma}`).toBeVisible();
  await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
}

const salvar = (page: Page) => page.getByRole("button", { name: /Save language|Salvar idioma/ });

test("1 · desktop — identidade e idioma padrão (EN)", async ({ page }) => {
  await montar(page, { inicial: null });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await expect(page.getByText(/Using English, the default/)).toBeVisible();
  await capturar(page, "01-desktop-padrao-en", "en");
});

test("2 · mobile — idioma padrão", async ({ page }) => {
  await montar(page, { inicial: null });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ROTA);
  await expect(salvar(page)).toBeVisible();
  await capturar(page, "02-mobile-padrao-en", "en");
});

test("3 · tablet — idioma padrão", async ({ page }) => {
  await montar(page, { inicial: null });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(ROTA);
  await expect(salvar(page)).toBeVisible();
  await capturar(page, "03-tablet-padrao-en", "en");
});

test("4 · inglês EXPLÍCITO — e é diferente do padrão", async ({ page }) => {
  await montar(page, { inicial: "en" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await expect(page.getByText(/English is your chosen language/)).toBeVisible();
  await expect(page.getByText(/Using English, the default/)).toHaveCount(0);
  await capturar(page, "04-desktop-en-explicito", "en");
});

test("5 · depois de salvar inglês a partir do padrão", async ({ page }) => {
  await montar(page, { inicial: null });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await salvar(page).click();
  await expect(page.getByText(/English is your chosen language/)).toBeVisible();
  await capturar(page, "05-desktop-padrao-virou-escolha", "en");
});

test("6 · português — desktop", async ({ page }) => {
  await montar(page, { inicial: "pt" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await expect(page.getByText(/Português é o idioma que você escolheu/)).toBeVisible();
  await capturar(page, "06-desktop-pt", "pt");
});

test("7 · português — mobile", async ({ page }) => {
  await montar(page, { inicial: "pt" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(ROTA);
  await expect(page.getByRole("button", { name: "Salvar idioma" })).toBeVisible();
  await capturar(page, "07-mobile-pt", "pt");
});

test("8 · salvando — o botão ocupado", async ({ page }) => {
  await montar(page, { inicial: "en", lento: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await page.getByRole("radio", { name: /Portuguese/ }).click();
  await salvar(page).click();
  // O que a captura documenta é o estado VISÍVEL: rótulo de progresso e botão indisponível. O
  // `aria-busy` é afirmado no spec de comportamento; aqui interessa o que a pessoa vê.
  await expect(page.getByRole("button", { name: /Saving|Salvando/ })).toBeDisabled();
  await capturar(page, "08-desktop-salvando", "en");
});

test("9 · a escrita falhou — a tela NÃO diz que salvou", async ({ page }) => {
  await montar(page, { inicial: "en", falharEscrita: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await page.getByRole("radio", { name: /Portuguese/ }).click();
  await salvar(page).click();
  await expect(page.getByText(/We couldn't save your language/)).toBeVisible();
  await capturar(page, "09-desktop-erro-ao-salvar", "en");
});

test("10 · a preferência não carregou — e isso não é 'sem preferência'", async ({ page }) => {
  await montar(page, { indisponivel: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await expect(page.getByText(/We couldn't load your language/)).toBeVisible();
  await capturar(page, "10-desktop-preferencia-indisponivel", "en");
});

test("11 · foco visível no controle", async ({ page }) => {
  await montar(page, { inicial: "pt" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ROTA);
  await page.getByRole("radio", { name: /English/ }).focus();
  await capturar(page, "11-desktop-foco-teclado-pt", "pt");
});

// AQUI FICAVA `12-mobile-pt-escolha-salva`, REMOVIDA na M45.6.
//
// Ela montava `{ inicial: "pt" }` — **exatamente a mesma montagem** da captura 7 — e as duas saíam
// byte a byte idênticas. O gate de evidência da M45.6 acusou.
//
// As âncoras eram diferentes e as duas passavam, o que escondia o problema: com o idioma já em
// `pt`, o botão de salvar E a frase "Português é o idioma que você escolheu" estão na MESMA tela.
// O estado que o nome promete — *depois de salvar* — não é visualmente distinto de *já está em
// português*, nesta montagem. Duas imagens, dois nomes, um estado.
//
// Não foi substituída por uma versão "com ação": alcançar a escolha salva a partir de outro idioma
// exige dirigir o formulário, e isso é a captura 8 (`salvando`) mais o desfecho — trabalho de quem
// for reabrir a M41, não desta tranche.
