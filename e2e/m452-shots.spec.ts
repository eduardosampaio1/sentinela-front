// M45.2 — as capturas da JORNADA da análise.
//
// ## Por que elas não existiam
//
// `docs/` tem capturas de configuração (M41/M42/M44), de Instância (inst05), das duas visões e da
// comparação (two-view). Da jornada — entrada, upload, processamento, confirmação, falha — não
// havia nenhuma. As telas mais transitórias do produto eram também as únicas sem evidência.
//
// ## O provador é o mesmo, e não há exceção
//
// Toda imagem afirma, ANTES de disparar, (1) uma âncora positiva do estado que o NOME do arquivo
// promete e (2) uma segunda frase que só existe naquele idioma. Duas âncoras, e não uma: a segunda
// impede a primeira de passar por um fragmento que sobreviveria a meia tela.
//
// Isto não é zelo: a M45.4 encontrou 29 capturas produzidas por specs sem UMA asserção, e duas
// delas documentavam, sob o próprio nome, o oposto do que mostravam.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const SAIDA = "docs/m45-2";
const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";
const INSTANCIA = "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

const ITENS = [
  { analysis_id: ANALISE, status: "completed", record_count: 1240, result_available: true, created_at: "2026-08-03T17:12:44Z", updated_at: "2026-08-03T17:13:02Z", instance_id: INSTANCIA },
  { analysis_id: "an-em-curso", status: "running", record_count: 900, result_available: false, created_at: "2026-08-04T09:00:00Z", updated_at: "2026-08-04T09:02:00Z", instance_id: INSTANCIA },
  { analysis_id: "an-precisa", status: "needs_mapping", record_count: 300, result_available: false, created_at: "2026-08-05T08:00:00Z", updated_at: "2026-08-05T08:01:00Z", instance_id: null },
];

interface Opcoes {
  readonly idioma?: "pt" | "en";
  readonly status?: string;
  readonly retry?: boolean;
  readonly povoado?: boolean;
  /** `503` no progresso — o estado que a correção desta tranche criou. */
  readonly progressoIndisponivel?: boolean;
}

async function montar(page: Page, o: Opcoes = {}) {
  const idioma = o.idioma ?? "en";
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  const json = (corpo: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(corpo),
  });

  await page.route("**/v1/me", (r) => r.fulfill(json(IDENTIDADE)));
  await page.route("**/v1/me/language", (r) =>
    r.fulfill(json({ stored_language: idioma, effective_language: idioma })),
  );
  await page.route("**/v1/workspaces/**", (r) =>
    r.fulfill(json({ workspace_id: ESCOPO, name: "Atendimento Norte", created_at: "2026-03-11T08:42:00Z" })),
  );
  await page.route("**/v1/subscriptions**", (r) => r.fulfill(json({ items: [] })));
  await page.route("**/v1/analyses**", (r) =>
    r.fulfill(json({ items: o.povoado ? ITENS : [], next_cursor: null })),
  );
  await page.route("**/v1/instances**", (r) =>
    r.fulfill(
      json({
        items: o.povoado ? [{ instance_id: INSTANCIA, name: "Suporte", created_at: "2026-05-02T11:15:00Z" }] : [],
        next_cursor: null,
      }),
    ),
  );
  await page.route("**/v1/analyses/*", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        status: o.status ?? "completed",
        record_count: 1240,
        result_available: (o.status ?? "completed") === "completed",
        retry_allowed: o.retry ?? false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    ),
  );
  await page.route("**/v1/analyses/*/progress**", (r) =>
    o.progressoIndisponivel
      ? r.fulfill(json({ code: "temporarily_unavailable", retryable: true }, 503))
      : r.fulfill(json({ analysis_id: ANALISE, axes: eixosDe(o.status ?? "completed") })),
  );
}

/**
 * Os quatro eixos COERENTES com o estado — ver a mesma função em `m45-matriz.spec.ts`.
 *
 * A primeira versão desta spec serviu `engine: running` para TODO estado, e as capturas de falha
 * saíram com "Não concluída" no cabeçalho e "PROCESSAMENTO: Em execução" logo abaixo: a mesma
 * imagem afirmando que a análise morreu e que ela ainda está andando. Evidência de uma tela que
 * não existe é pior que evidência faltando.
 */
function eixosDe(status: string) {
  if (status === "failed") {
    return [
      { axis: "engine", state: "failed" },
      { axis: "analytics", state: "failed" },
      { axis: "export", state: "unavailable" },
      { axis: "final_result", state: "failed" },
    ];
  }
  if (status === "completed") {
    return [
      { axis: "engine", state: "ready" },
      { axis: "analytics", state: "ready" },
      { axis: "export", state: "ready" },
      { axis: "final_result", state: "ready" },
    ];
  }
  return [
    { axis: "engine", state: "running" },
    { axis: "analytics", state: "pending" },
    { axis: "export", state: "unavailable" },
    { axis: "final_result", state: "pending" },
  ];
}

/** Frases que existem em UM idioma só. É por elas que a captura prova o que declara ser.
 *
 * A M45.2 tirou "Nova análise" da barra de topo das telas de uma análise existente, e seis
 * capturas ficaram vermelhas aqui — corretamente: a marca padrão deixou de existir naquelas telas.
 * Cada estado vivo passou a declarar a sua. */
const MARCA = { en: /New analysis/, pt: /Nova análise/ } as const;

async function capturar(
  page: Page,
  nome: string,
  idioma: "pt" | "en",
  ancora: RegExp,
  marca: RegExp = MARCA[idioma],
) {
  const main = page.locator("main");
  await expect(
    main.getByText(ancora).first(),
    `${nome}: o estado que o nome promete não apareceu antes do disparo`,
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText(marca).first(),
    `${nome}: a captura diz ser ${idioma} — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true });
}

interface Tela {
  readonly nome: string;
  readonly w: number;
  readonly h: number;
  readonly rota: string;
  readonly opts: Opcoes;
  readonly ancora: RegExp;
  /**
   * Marca de idioma DESTA tela, quando a padrão não está nela.
   *
   * O passo de upload não imprime "New analysis" em lugar nenhum: ele é a análise já reservada,
   * pedindo a base. Usar a marca padrão ali reprovava a captura por uma frase que nunca esteve na
   * tela — instrumento, não produto.
   */
  readonly marca?: RegExp;
}

const TELAS: readonly Tela[] = [
  { nome: "01-desktop-entrada-en", w: 1280, h: 900, rota: "/analyses/new", opts: {}, ancora: /Reserve the analysis/ },
  { nome: "02-desktop-aguardando-base-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "preparing" }, ancora: /Add your dataset/, marca: /Send dataset/ },
  { nome: "03-desktop-processando-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "running" }, ancora: /Your analysis is being processed/, marca: /What is happening/ },
  { nome: "04-desktop-confirmacao-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "needs_mapping" }, ancora: /not exposed in the public contract/, marca: /Check again/ },
  { nome: "05-desktop-falha-com-retry-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "failed", retry: true }, ancora: /Couldn't complete/, marca: /What is happening/ },
  { nome: "06-desktop-falha-sem-retry-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "failed", retry: false }, ancora: /Couldn't complete/, marca: /What is happening/ },
  // O estado que a correção (1) desta tranche criou: leitura indisponível ≠ "não medido".
  { nome: "07-desktop-progresso-indisponivel-en", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "running", progressoIndisponivel: true }, ancora: /temporarily unavailable/, marca: /What is happening/ },
  { nome: "08-desktop-home-povoada-en", w: 1280, h: 1100, rota: "/home", opts: { povoado: true }, ancora: /In progress/ },
  { nome: "09-desktop-lista-povoada-en", w: 1280, h: 900, rota: "/analyses", opts: { povoado: true }, ancora: /1240 records/ },
  { nome: "10-mobile-processando-en", w: 375, h: 812, rota: `/analyses/${ANALISE}`, opts: { status: "running" }, ancora: /Your analysis is being processed/, marca: /What is happening/ },
  { nome: "11-mobile-home-povoada-en", w: 375, h: 812, rota: "/home", opts: { povoado: true }, ancora: /In progress/ },
  { nome: "12-desktop-confirmacao-pt", w: 1280, h: 900, rota: `/analyses/${ANALISE}`, opts: { status: "needs_mapping", idioma: "pt" }, ancora: /não está exposta no contrato público/, marca: /Verificar novamente/ },
];

for (const tela of TELAS) {
  test(`captura ${tela.nome}`, async ({ page }) => {
    await page.setViewportSize({ width: tela.w, height: tela.h });
    const idioma = tela.opts.idioma ?? "en";
    await montar(page, tela.opts);
    await page.goto(tela.rota);
    await capturar(page, tela.nome, idioma, tela.ancora, tela.marca ?? MARCA[idioma]);
  });
}
