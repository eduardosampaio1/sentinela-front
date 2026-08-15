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

/** O espaço ATIVO da sessão, semeado pelo bypass de E2E. A claim tem de apontar para ELE — em
 *  produção claim e escopo falam do mesmo espaço, e divergi-los aqui faria a reconciliação nunca
 *  casar, deixando a captura verde sem mostrar o fato. */
const ESCOPO_ATIVO = "e2e-workspace-0000";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO_ATIVO, name: NOME_NA_CLAIM, role: "owner" }],
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
  // M45.4 — a seção de Notificações (M44) vive NESTA página, e esta spec não a servia.
  //
  // O sintoma só apareceu quando a suíte completa reescreveu as capturas: a imagem
  // `11-mobile-workspace-en.png`, que documenta a configuração do ESPAÇO, passou a mostrar
  // "Notifications are unavailable right now" — porque `/v1/subscriptions` caía na rede real.
  // Uma captura que documenta uma coisa e exibe outra em estado de erro é pior que captura
  // faltando: ela é lida como evidência de que a página está assim.
  //
  // Ausência (`items: []`) e não indisponibilidade: o recorte destas capturas é CFG-03, e a
  // vizinha precisa aparecer no seu estado normal, não num erro que não é o assunto.
  await page.route("**/v1/subscriptions**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
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
  // `fullPage: true` NAO basta: o scroll desta aplicacao e de um container interno do
  // `AppShell`, nao do documento. A captura saia 1280x800 com a secao do Workspace cortada no
  // titulo — treze imagens que nao mostravam o que diziam mostrar. Rolar o alvo para a vista
  // ANTES de disparar e o que torna a captura uma prova.
  await page.locator("main").getByRole("button", { name: marca ?? MARCA[idioma] }).first()
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `docs/m42/${nome}.png`, fullPage: true });
  void info;
}

const campoWs = (page: Page) => page.getByLabel(/^Name$|^Nome$/);

test.describe("M42 · capturas", () => {
  test("01–02 · Workspace: corrente e renomeado", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en" });
    await page.goto("/dashboard/settings");
    await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
    await capturar(page, "01-desktop-workspace-current-en", "en", info);

    await campoWs(page).fill("Atendimento Nacional");
    await page.getByRole("button", { name: /^Save name$/ }).click();
    await expect(page.getByText(/Workspace name saved/)).toBeVisible();
    await capturar(page, "02-desktop-workspace-renamed-en", "en", info);
  });

  // 03 — a página INTEIRA com um nome só, sendo que a claim traz outro.
  //
  // Esta captura já mudou de sentido duas vezes, e as duas por defeito:
  //
  //  1. nasceu como uma segunda chamada de `capturar` sobre o estado de 01, sem nada entre as
  //     duas — saía byte a byte idêntica, e a divergência que o nome prometia ficava fora do
  //     quadro porque a lista da claim vive no topo e o scroll da seção a empurrava para fora;
  //  2. virou um quadro alto que mostrava os dois nomes convivendo. Isso era verdade e era o
  //     defeito: o mesmo espaço aparecia com dois nomes na mesma tela.
  //
  // Depois da reconciliação, o que precisa ser fotografado é o oposto — a claim continua velha
  // no `/v1/me`, e a tela inteira fala UM nome. A viewport alta é render real, e existe para que
  // "a tela inteira" seja literalmente a tela inteira.
  test("03 · a tela inteira sob UM nome, com a claim ainda velha", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1400 });
    await montar(page, { idioma: "en" });
    await page.goto("/dashboard/settings");

    await expect(campoWs(page)).toHaveValue(NOME_DO_PRODUTOR);
    await expect(page.locator("main").getByRole("button", { name: MARCA.en })).toBeVisible();
    // O nome velho foi servido pela claim e não sobrevive em lugar nenhum — nem no `main`, nem
    // na lateral. Asserido ANTES de disparar, senão a imagem é decorativa.
    await expect(page.getByText(NOME_NA_CLAIM)).toHaveCount(0);
    await expect(page.getByText(/^Active workspace$/i).locator("..")).toContainText(
      NOME_DO_PRODUTOR,
    );
    await page.screenshot({ path: "docs/m42/03-desktop-workspace-reconciled-en.png" });
  });

  test("04 · Workspace indisponível", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en", wsIndisponivel: true });
    await page.goto("/dashboard/settings");
    await expect(page.getByText(/Workspace settings are unavailable/)).toBeVisible();
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

  // 08 — a Instância INDISPONÍVEL.
  //
  // Esta captura era um `screenshot` cru depois de `waitForTimeout(400)`. A política de retry
  // transitório são 2 tentativas com backoff de 1 s e 2 s: aos 400 ms a tela ainda é esqueleto.
  // A imagem publicada como "instance unavailable" mostrava três barras cinza e mais nada — e
  // era a ÚNICA das treze que não passava por `capturar`, justamente porque não tinha conteúdo
  // que provasse idioma. Esse desvio era o sintoma, e eu o tratei como exceção aceitável.
  //
  // Agora ela usa a mesma âncora do caminho triste da CFG-03 (`Try again`), que só existe quando
  // o estado terminal renderizou.
  test("08 · Instância indisponível", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await montar(page, { idioma: "en", instIndisponivel: true });
    await page.goto(`/instances/${I1}`);
    await expect(page.getByText(/This instance is unavailable right now/)).toBeVisible({
      timeout: 15_000,
    });
    await capturar(page, "08-desktop-instance-unavailable-en", "en", info, /^Try again$/);
  });

  // 09 · disponibilidade mista — REMOVIDA, e não substituída.
  //
  // Ela fotografava `/dashboard/settings` com a Instância montada em `503`. Só que essa rota não
  // emite requisição nenhuma de Instância: o quadro sai byte a byte idêntico ao de 01, e saía
  // mesmo. Um arquivo chamado "mixed availability" que é o pixel exato de "current" não prova
  // contenção de falha — ele empresta credibilidade do nome do arquivo para uma imagem que não
  // contém o fato. Os dois donos vivem em ROTAS diferentes, então nenhum quadro único os mostra
  // ao mesmo tempo, e inventar uma tela que os juntasse seria inventar produto.
  //
  // A contenção continua provada, por teste e não por pixel: `m42-cfg-workspace.spec.ts` "F"
  // mostra o espaço indisponível com a seção de idioma viva ao lado, e `m42-cfg-instancia.spec`
  // "N" mostra a Instância indisponível sem derrubar a página. A captura 08 é a face visível
  // dessa segunda metade.

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
