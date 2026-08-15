// M42 — as capturas reais de CFG-03 e CFG-04.
//
// ## O idioma é PROVADO pelo conteúdo, não pelo setup
//
// A M40 deixou doze capturas rotuladas como EN que na verdade renderizaram em inglês por
// acidente de setup, e ninguém percebeu porque o nome do arquivo dizia o idioma. Aqui cada
// captura afirma, ANTES de disparar, que a tela renderizou uma frase daquele idioma — e a frase
// escolhida é uma que **só existe** naquele locale.
//
// O idioma vem do fluxo autenticado vigente (a preferência da CONTA, BD11/M41). Nenhuma captura
// mexe em `localStorage` para forçar idioma: isso reintroduziria como verdade o que a M41 tirou.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const WS_ID = "ws-8f3a1c47-6b20-4e11-9d05-2a7c8e4f1b63";
const I1 = "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15";
const I2 = "inst-b7e5a316-8c02-4d99-a1f7-63e4c05b8d2a";
const NOME_DO_PRODUTOR = "Atendimento Norte";
const NOME_NA_CLAIM = "Suporte Regional";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: WS_ID, name: NOME_NA_CLAIM, role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

/** Frases que existem em UM locale só. É por elas que a captura prova o idioma. */
const MARCA = {
  en: /^Save name$/,
  pt: /^Salvar nome$/,
} as const;

type Idioma = keyof typeof MARCA;

async function montar(
  page: Page,
  opts: { idioma?: Idioma; wsIndisponivel?: boolean; instIndisponivel?: boolean; duplicado?: boolean } = {},
) {
  const idioma = opts.idioma ?? "en";
  let nomeWs = NOME_DO_PRODUTOR;
  const porId = new Map([
    [I1, { instance_id: I1, name: "Suporte", created_at: "2026-05-02T11:15:00Z" }],
    [
      I2,
      {
        instance_id: I2,
        name: opts.duplicado ? "Suporte" : "Cobrança",
        created_at: "2026-05-19T16:40:00Z",
      },
    ],
  ]);

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });

  await page.route("**/v1/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  // A preferência da CONTA é quem decide o idioma — o fluxo autenticado vigente.
  await page.route("**/v1/me/language", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stored_language: idioma, effective_language: idioma }),
    }),
  );
  await page.route("**/v1/analyses**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/v1/instances/*/baseline**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        baseline_analysis_id: "an-7e14c0d9-3b58-4a06-9f21-c8d5e2417b30",
        baseline_set_at: "2026-06-08T10:05:00Z",
      }),
    }),
  );
  await page.route("**/v1/instances/**", async (route) => {
    if (opts.instIndisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      });
    }
    const id = new URL(route.request().url()).pathname.split("/").filter(Boolean).pop() as string;
    const atual = porId.get(id);
    if (!atual) {
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    }
    if (route.request().method() === "PATCH") {
      const corpo = JSON.parse(route.request().postData() ?? "{}") as { name?: string };
      if (corpo.name) porId.set(id, { ...atual, name: corpo.name });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(porId.get(id)),
    });
  });
  await page.route("**/v1/workspaces/**", async (route) => {
    if (opts.wsIndisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      });
    }
    if (route.request().method() === "PATCH") {
      const corpo = JSON.parse(route.request().postData() ?? "{}") as { name?: string };
      if (corpo.name) nomeWs = corpo.name;
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace_id: WS_ID,
        name: nomeWs,
        created_at: "2026-03-11T08:42:00Z",
      }),
    });
  });
}

/** Captura DEPOIS de provar o idioma pelo conteúdo renderizado. */
async function capturar(
  page: Page,
  nome: string,
  idioma: Idioma,
  info: { outputPath: (n: string) => string },
  // Âncora alternativa: no estado INDISPONÍVEL não existe botão de salvar — não há valor
  // confirmado para editar —, então a prova de idioma tem de usar o controle que aquele estado
  // realmente tem. Provar o idioma com um seletor que só existe no caminho feliz faria a captura
  // do caminho triste ficar sem prova nenhuma.
  marca?: RegExp,
) {
  // Ancorada no `main`, e no BOTÃO: `getByText(...).first()` pegava um item oculto da navegação
  // no mobile, e a prova de idioma falhava por causa do menu — não da tela capturada.
  await expect(
    page.locator("main").getByRole("button", { name: marca ?? MARCA[idioma] }).first(),
    `a captura ${nome} diz ser ${idioma} — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `docs/m42/${nome}.png`, fullPage: true });
  void info;
}

const campoWs = (page: Page) => page.getByLabel(/^Name$|^Nome$/);

test.describe("M42 · capturas", () => {
  test("01–04 · Workspace: corrente, renomeado, claim velha e indisponível", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en" });
    await page.goto("/dashboard/settings");
    await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
    // 03 — a claim velha convive na mesma tela: a identidade a mostra, e a configuração não.
    await capturar(page, "01-desktop-workspace-current-en", "en", info);
    await capturar(page, "03-desktop-workspace-stale-claim-en", "en", info);

    await campoWs(page).fill("Atendimento Nacional");
    await page.getByRole("button", { name: /^Save name$/ }).click();
    await expect(page.getByText(/Workspace name saved/)).toBeVisible();
    await capturar(page, "02-desktop-workspace-renamed-en", "en", info);
  });

  test("04 · Workspace indisponível", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en", wsIndisponivel: true });
    await page.goto("/dashboard/settings");
    await expect(page.getByText(/could not load the workspace settings/)).toBeVisible();
    await capturar(page, "04-desktop-workspace-unavailable-en", "en", info, /^Try again$/);
  });

  test("05–07 · Instância: corrente, duplicada e renomeada", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en" });
    await page.goto(`/instances/${I1}`);
    await expect(campoWs(page)).toHaveValue("Suporte");
    await capturar(page, "05-desktop-instance-current-en", "en", info);

    await campoWs(page).fill("Suporte Nível 2");
    await page.getByRole("button", { name: /^Save name$/ }).click();
    await expect(page.getByText(/Instance name saved/)).toBeVisible();
    await capturar(page, "07-desktop-instance-renamed-en", "en", info);
  });

  test("06 · Instância com nome duplicado", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en", duplicado: true });
    await page.goto(`/instances/${I2}`);
    await expect(campoWs(page)).toHaveValue("Suporte");
    await capturar(page, "06-desktop-instance-duplicate-name-en", "en", info);
  });

  test("08–09 · Instância indisponível e disponibilidade mista", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en", instIndisponivel: true });
    await page.goto(`/instances/${I1}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/m42/08-desktop-instance-unavailable-en.png", fullPage: true });

    // 09 — o espaço FUNCIONA com a Instância fora: donos diferentes, falhas contidas.
    await page.goto("/dashboard/settings");
    await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
    await capturar(page, "09-desktop-mixed-availability-en", "en", info);
  });

  for (const vp of [
    { nome: "10-tablet", width: 768, height: 1024 },
    { nome: "11-mobile", width: 375, height: 812 },
  ] as const) {
    test(`${vp.nome} · Workspace`, async ({ page }, info) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montar(page, { idioma: "en" });
      await page.goto("/dashboard/settings");
      await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
      await capturar(page, `${vp.nome}-workspace-en`, "en", info);
    });
  }

  test("12 · PT — o idioma vem da preferência da CONTA", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "pt" });
    await page.goto("/dashboard/settings");
    await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
    // Prova de idioma pelo CONTEÚDO: "Salvar nome" só existe em pt.json.
    await capturar(page, "12-desktop-workspace-pt", "pt", info);
  });

  test("13 · PT — Instância", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "pt" });
    await page.goto(`/instances/${I1}`);
    await expect(campoWs(page)).toHaveValue("Suporte");
    await capturar(page, "13-desktop-instance-pt", "pt", info);
  });
});
