// M45 — a matriz transversal das journeys da V1.
//
// ## A pergunta que esta suíte faz, e que nenhuma missão anterior fez
//
// As missões perguntaram *"esta feature passou?"*. Esta pergunta é outra: **as features que já
// passaram formam uma experiência coerente quando vistas juntas?**
//
// Por isso ela não reprova regra de negócio — isso é das suítes por missão, e elas continuam
// verdes. Ela mede o que só aparece atravessando o produto:
//
// * **navegabilidade** (gate 1): toda superfície REAL alcança um estado TERMINAL. Um esqueleto
//   permanente não é uma superfície navegável, e foi assim que a página da Instância passou
//   despercebida até a M42;
// * **erro/vazio/carregando distintos** (gate 11): três estados, três telas. Colapsar dois deles é
//   o defeito recorrente do programa inteiro — `503` virando "não existe", ausência virando falha;
// * **teclado e axe** (gate 7): em cada superfície, não só nas duas que a M42/M44 cobriram;
// * **responsive** (gate 5): sem rolagem horizontal em três larguras;
// * **PT/EN** (gate 6): provados pelo CONTEÚDO renderizado, nunca por `localStorage` — foi a
//   dívida da M40.
//
// ## Por que uma montagem só
//
// Cada superfície tinha a sua, e nenhuma media a vizinhança. Um `montar` transversal serve o
// produto inteiro de uma vez, e é isso que permite navegar de uma rota para outra dentro do mesmo
// documento — que é como a pessoa usa.

import axe from "axe-core";
import { expect, test, type Page } from "@playwright/test";
// A massa v2 REAL — a mesma do adapter. Escrever uma aqui provaria que a tela lê o que eu inventei.
import { V2_READY } from "@/test/fixtures/canonical-result/massasV2";

test.use({ serviceWorkers: "block" });

const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";
const INSTANCIA = "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

/** O produto inteiro respondendo — uma montagem, todas as superfícies. */
async function montarProduto(page: Page, idioma: "pt" | "en" = "en") {
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

  // A ORDEM importa: o Playwright casa a ÚLTIMA rota registrada primeiro, então as gerais entram
  // antes das específicas. Invertendo, a listagem engole o detalhe e a tela fica em "Preparing"
  // para sempre — o sintoma chega como "a rota não abre".
  // PREDICADO de caminho, e nao glob de prefixo.
  //
  // `**/v1/analyses**` casa TAMBEM `/v1/analyses/{id}/result`, `/timeline`, `/progress` e
  // `/analytics` -- e a ultima rota registrada vence. Foi assim que a linha do tempo recebeu
  // `{items: [], next_cursor: null}` e a pagina inteira caiu no ErrorBoundary, e foi assim que o
  // laco de responsive (que reusa UMA pagina entre journeys) fez o `povoar` de J13/J14 envenenar
  // o `/result` de J15. Um predicado so casa a listagem, e nada mais.
  await page.route(
    (url) => url.pathname === "/v1/analyses",
    (r) => r.fulfill(json({ items: [], next_cursor: null })),
  );
  await page.route("**/v1/instances**", (r) => r.fulfill(json({ items: [], next_cursor: null })));
  await page.route("**/v1/instances/*/baseline**", (r) =>
    r.fulfill(json({ baseline_analysis_id: null, baseline_set_at: null })),
  );
  await page.route("**/v1/instances/*", (r) =>
    r.fulfill(json({ instance_id: INSTANCIA, name: "Suporte", created_at: "2026-05-02T11:15:00Z" })),
  );
  await page.route("**/v1/analyses/*", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        status: "completed",
        record_count: 1240,
        result_available: true,
        retry_allowed: false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    ),
  );

  // M45.3 — o documento do resultado e a linha do tempo entram na montagem BASE.
  //
  // RES-01 é **LEGACY COMPATIBILITY** e está congelada no Blueprint §4.6: continua servindo deep
  // link antigo, não recebe feature nova, e nenhuma navegação canônica aponta para ela. Congelada
  // não é aposentada — quem tem o link cai nela hoje, e a matriz nunca a visitou. Era o único
  // motivo de E5 estar como NO CREDIT na discovery.
  //
  // A massa é a MESMA que o adapter usa (`V2_READY`), embrulhada no envelope público. As duas
  // coisas são distintas e confundi-las custou quatro tentativas na sondagem desta tranche: as
  // massas de `fixtures/canonical-result` são o DOCUMENTO; o envelope é `{analysis_id,
  // result_schema_version, indicator_registry_version, result}`.
  await page.route("**/v1/analyses/*/result**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        result_schema_version: String(V2_READY.result_schema_version),
        indicator_registry_version: "indicator-registry-1.0",
        result: V2_READY,
      }),
    ),
  );
  // `/timeline` é rota própria, e precisa vir DEPOIS da geral `**/v1/analyses**` — que a casa
  // também, por ser um glob de prefixo. Sem esta linha a linha do tempo recebia
  // `{items: [], next_cursor: null}`: corpo verdadeiro, sem `events`, e a página inteira caía no
  // ErrorBoundary. Era a montagem, não o produto — o guarda do produto (`timeline.data &&`) está
  // certo, e `event_id` é contratado.
  await page.route("**/v1/analyses/*/timeline**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        events: [
          { event_id: "ev-1", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 1, event_type: "analysis.started", occurred_at: "2026-08-03T17:12:44Z" },
          { event_id: "ev-2", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 2, event_type: "analysis.completed", occurred_at: "2026-08-03T17:13:02Z" },
          { event_id: "ev-3", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 3, event_type: "result.available", occurred_at: "2026-08-03T17:13:05Z" },
        ],
      }),
    ),
  );
  await page.route("**/v1/analyses/*/analytics**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        component_status: "ready",
        snapshot_contract_version: "analytics-snapshot-v9",
        snapshot_digest: "sd",
        snapshot: { snapshot_contract_version: "analytics-snapshot-v9", record_count: 1240, numeric: [], distributions: [], dimensions: [], concentrations: [], time_series: [] },
        disclosure_rule_version: "dr-1",
        projection_digest: "pd",
        withheld: null,
        generated_at: "2026-08-01T00:00:00Z",
      }),
    ),
  );

  // O progresso entra na montagem BASE desde a M45.2. Sem ele, os estados vivos da jornada
  // renderizam o aviso de leitura indisponível — que é o comportamento certo depois da correção
  // desta tranche, e transformaria J9–J12 em medições do aviso em vez das telas.
  // Fica por último de propósito: os casos do G11 registram a própria rota depois desta e vencem.
  await page.route("**/v1/analyses/*/progress**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        axes: [
          { axis: "engine", state: "running" },
          { axis: "analytics", state: "pending" },
          { axis: "export", state: "unavailable" },
          { axis: "final_result", state: "pending" },
        ],
      }),
    ),
  );
}

const json = (corpo: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(corpo),
});

/**
 * Os quatro eixos COERENTES com o estado da análise.
 *
 * A primeira versão servia um payload fixo (`engine: running`) para todo estado, e a tela de falha
 * saía dizendo "Não concluída" no cabeçalho e "PROCESSAMENTO: Em execução · RESULTADO FINAL:
 * Pendente" logo abaixo — a mesma tela afirmando que a análise morreu e que ela ainda está
 * andando. A captura 05 desta tranche documentou isso antes de alguém notar.
 *
 * Era a MASSA, não o produto: os eixos são independentes do estado por contrato, e a tela
 * apresenta o que o produtor diz sem interpretar. Mas uma combinação que o produtor nunca
 * publicaria não prova nada, e vira evidência de uma tela que não existe.
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

/** A análise servida num estado da jornada — sobrepõe o `completed` da montagem base. */
async function emEstado(
  page: Page,
  status: string,
  opts: { retry?: boolean } = {},
): Promise<void> {
  await page.route("**/v1/analyses/*/progress**", (r) =>
    r.fulfill(json({ analysis_id: ANALISE, axes: eixosDe(status) })),
  );
  await page.route("**/v1/analyses/*", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        status,
        record_count: 1240,
        result_available: false,
        retry_allowed: opts.retry ?? false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    ),
  );
}

/** O produtor recusa o documento: `404 result_not_available`. Ausência, não queda. */
async function semResultado(page: Page): Promise<void> {
  // O status segue anunciando `result_available: true`, e isso NAO e incoerencia: e o caso de
  // RETENCAO -- o documento existiu e a purga o levou. Com `result_available: false` a tela diz
  // outra coisa (o resultado ainda esta sendo preparado), que e um estado diferente.
  await page.route("**/v1/analyses/*/result**", (r) =>
    r.fulfill(json({ code: "result_not_available" }, 404)),
  );
}

/** Três análises em estados diferentes e uma Instância — o produto com CONTEÚDO. */
async function povoar(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === "/v1/analyses",
    (r) =>
    r.fulfill(
      json({
        items: [
          { analysis_id: ANALISE, status: "completed", record_count: 1240, result_available: true, created_at: "2026-08-03T17:12:44Z", updated_at: "2026-08-03T17:13:02Z", instance_id: INSTANCIA },
          { analysis_id: "an-em-curso", status: "running", record_count: 900, result_available: false, created_at: "2026-08-04T09:00:00Z", updated_at: "2026-08-04T09:02:00Z", instance_id: INSTANCIA },
          { analysis_id: "an-precisa", status: "needs_mapping", record_count: 300, result_available: false, created_at: "2026-08-05T08:00:00Z", updated_at: "2026-08-05T08:01:00Z", instance_id: null },
        ],
        next_cursor: null,
      }),
    ),
  );
  await page.route("**/v1/instances**", (r) =>
    r.fulfill(
      json({
        items: [{ instance_id: INSTANCIA, name: "Suporte", created_at: "2026-05-02T11:15:00Z" }],
        next_cursor: null,
      }),
    ),
  );
}

/**
 * As journeys da V1, com o estado TERMINAL de cada uma.
 *
 * A âncora não é "a página respondeu": é uma frase que só existe quando a superfície terminou de
 * decidir o que mostrar. É o que separa navegável de montado.
 */
interface Journey {
  readonly id: string;
  readonly nome: string;
  readonly rota: string;
  readonly terminal: RegExp;
  /** Sobreposicao de montagem desta journey, alem do produto base. */
  readonly montar?: (page: Page) => Promise<void>;
}

const JOURNEYS: readonly Journey[] = [
  { id: "J1", nome: "análises", rota: "/analyses", terminal: /No analyses yet|Nenhuma análise ainda/ },
  { id: "J2", nome: "análise", rota: `/analyses/${ANALISE}`, terminal: /Analysis completed|Análise concluída/ },
  { id: "J3", nome: "instâncias", rota: "/instances", terminal: /instance|Instância/i },
  { id: "J4", nome: "instância", rota: `/instances/${INSTANCIA}`, terminal: /Reference analysis|Análise de referência/ },
  { id: "J5", nome: "configurações", rota: "/dashboard/settings", terminal: /Notifications|Notificações/ },
  { id: "J6", nome: "workspaces", rota: "/workspaces", terminal: /workspace|espaço/i },
  // `/./` casava qualquer coisa — um gate que mede a existência de um caractere. Trocado por uma
  // âncora REAL: a frase que a Home só imprime depois de decidir o que mostrar.
  { id: "J7", nome: "home", rota: "/home", terminal: /What needs you in this workspace|O que precisa de você/ },

  // ── M45.2 · os estados VIVOS e as telas POVOADAS ────────────────────────────────────────
  //
  // As sete acima pousam TODAS em estado terminal, e J1/J7 montam a lista e a Home VAZIAS. Era o
  // buraco desta tranche: axe, geometria e idioma nunca tinham sido medidos onde a jornada anda —
  // nem onde há conteúdo. Uma tela vazia não estoura largura, não tem contraste para errar e não
  // tem quase nada para o leitor de tela anunciar; ela passa em tudo por não ter o que reprovar.
  //
  // Cada uma traz a própria sobreposição de montagem. O produto base continua o mesmo.
  { id: "J8", nome: "nova análise", rota: "/analyses/new",
    terminal: /Reserve the analysis|Reserve a análise/ },
  { id: "J9", nome: "aguardando a base", rota: `/analyses/${ANALISE}`,
    terminal: /Add your dataset|Adicione sua base/, montar: (p: Page) => emEstado(p, "preparing") },
  { id: "J10", nome: "processando", rota: `/analyses/${ANALISE}`,
    terminal: /Your analysis is being processed|Sua análise está sendo processada/,
    montar: (p: Page) => emEstado(p, "running") },
  { id: "J11", nome: "confirmação necessária", rota: `/analyses/${ANALISE}`,
    terminal: /Confirmation needed|Confirmação necessária/,
    montar: (p: Page) => emEstado(p, "needs_mapping") },
  { id: "J12", nome: "falha terminal", rota: `/analyses/${ANALISE}`,
    terminal: /Couldn't complete|Não concluída/,
    montar: (p: Page) => emEstado(p, "failed", { retry: true }) },
  { id: "J13", nome: "home povoada", rota: "/home",
    // `In progress` só existe com análise em curso — "Actions needed" aparece VAZIA também, e
    // ancorar nela mediria a Home vazia outra vez, com outro nome.
    terminal: /In progress|Em andamento/, montar: povoar },
  { id: "J14", nome: "lista povoada", rota: "/analyses",
    terminal: /records|registros/, montar: povoar },

  // ── M45.3 · RES-01, a superfície CONGELADA que a matriz nunca visitou ────────────────────
  //
  // Congelada não é aposentada. O Blueprint §4.6 diz que ela *"continua funcional e servindo deep
  // link antigo"* — quem tem o link cai nela hoje. Era o único motivo de E5 aparecer como
  // NO CREDIT na discovery histórica: nenhuma feature nova, e nenhuma medição transversal também.
  { id: "J15", nome: "resultado (legado)", rota: `/analyses/${ANALISE}/result`,
    terminal: /Why trust this result|Por que confiar/ },
  { id: "J16", nome: "resultado indisponível", rota: `/analyses/${ANALISE}/result`,
    terminal: /No result is available|Nenhum resultado/, montar: semResultado },
] as const;

// ══════════════════════════════════════════════════════════════════════════════════════════
// G1 · navegabilidade — toda superfície alcança estado TERMINAL
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G1 · superfícies navegáveis", () => {
  for (const j of JOURNEYS) {
    test(`${j.id} · ${j.nome} alcança estado terminal`, async ({ page }) => {
      await montarProduto(page);
      await j.montar?.(page);
      await page.goto(j.rota);

      // Terminal, e não "montou": `main` com conteúdo real, e a âncora da superfície.
      await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });

      const texto = await page.locator("main").innerText();
      expect(texto.trim().length, `${j.id} ficou em esqueleto`).toBeGreaterThan(10);

      // Nenhuma superfície pode terminar mostrando vocabulário interno.
      for (const interno of ["job_id", "lease_token", "object_key", "stack_trace", "presigned"]) {
        expect(texto.toLowerCase(), `${j.id} vazou vocabulário interno: ${interno}`)
          .not.toContain(interno);
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G11 · erro, vazio e carregando são TRÊS telas distintas
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G11 · os três estados não colapsam", () => {
  test("vazio ≠ erro na listagem de análises", async ({ page }) => {
    await montarProduto(page);
    await page.goto("/analyses");
    await expect(page.locator("main")).toContainText(/No analyses yet/, { timeout: 15_000 });

    const vazio = await page.locator("main").innerText();
    expect(vazio.length).toBeGreaterThan(20);
    // A tela de vazio NÃO pode falar em falha: ausência é estado legítimo.
    expect(vazio, "vazio apresentado como erro").not.toMatch(/couldn't load|unavailable|error/i);
  });

  test("erro ≠ vazio: `503` na listagem não vira 'nenhuma análise'", async ({ page }) => {
    await montarProduto(page);
    await page.route("**/v1/analyses**", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      }),
    );
    await page.goto("/analyses");

    // ÂNCORA POSITIVA antes da negativa — sem ela, "não diz vazio" valeria sobre um esqueleto.
    await expect(page.locator("main")).toContainText(/couldn't load|Try again/i, { timeout: 20_000 });
    const texto = await page.locator("main").innerText();
    expect(texto.length).toBeGreaterThan(20);
    expect(texto, "outage virou ausência").not.toMatch(/No analyses yet/);
  });

  // M45.2 — o painel de progresso dizia a MESMA frase por três causas diferentes.
  //
  // `lerEixos(undefined)` devolve os quatro eixos com `entrada: null`, e `entrada: null` significa
  // *"o produtor não publicou este eixo"*. Só que `data` também é `undefined` quando a leitura
  // FALHOU, quando foi RECUSADA e enquanto NÃO VOLTOU — e as três situações imprimiam "Não medido"
  // quatro vezes, idêntico ao caso em que o produtor de fato não mediu. A pessoa lia uma afirmação
  // sobre os DADOS dela durante uma indisponibilidade do sistema.
  //
  // Os dois casos abaixo medem as duas causas de sistema. A terceira — o produtor respondendo com
  // eixo ausente — continua sendo "não medido", e é isso que os separa.
  /** O painel só existe enquanto a jornada ANDA: com `completed` a tela mostra o resultado. */
  async function emProcessamento(page: Page) {
    await page.route("**/v1/analyses/*", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          analysis_id: ANALISE,
          status: "running",
          record_count: 1240,
          result_available: false,
          retry_allowed: false,
          created_at: "2026-08-03T17:12:44Z",
          updated_at: "2026-08-03T17:13:02Z",
          instance_id: null,
        }),
      }),
    );
  }

  test("indisponível ≠ não medido no painel de progresso", async ({ page }) => {
    await montarProduto(page);
    await emProcessamento(page);
    await page.route("**/v1/analyses/*/progress**", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      }),
    );
    await page.goto(`/analyses/${ANALISE}`);

    // ÂNCORA POSITIVA, e fora da janela de retry: `503` é retentável, e medir antes de o estado
    // terminal chegar leria a tela ainda em silêncio — massa vazia por TEMPO.
    await expect(page.locator("main")).toContainText(/temporarily unavailable/i, { timeout: 30_000 });
    const texto = await page.locator("main").innerText();
    expect(texto.length).toBeGreaterThan(20);
    expect(texto, "indisponibilidade virou afirmação sobre os dados").not.toMatch(/Not measured/i);
  });

  test("recusado ≠ não medido no painel de progresso", async ({ page }) => {
    await montarProduto(page);
    await emProcessamento(page);
    await page.route("**/v1/analyses/*/progress**", (r) =>
      r.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ code: "forbidden_or_not_found" }),
      }),
    );
    await page.goto(`/analyses/${ANALISE}`);

    await expect(page.locator("main")).toContainText(/doesn't exist or isn't available/i, {
      timeout: 20_000,
    });
    const texto = await page.locator("main").innerText();
    expect(texto, "recusa virou afirmação sobre os dados").not.toMatch(/Not measured/i);
  });

  // Decisão de owner (2026-08-15): o erro de um PEDAÇO da tela sai em tom neutro.
  //
  // A caixa vermelha com `role="alert"` aparecia enquanto o cabeçalho dizia "Em execução · sua
  // análise está sendo processada". Ela interrompe o leitor de tela e faz quem passa o olho
  // concluir que perdeu a análise — que está inteira. O painel declara `escopo="detalhe"`.
  //
  // O caso mede as DUAS direções. Só exigir o neutro aqui deixaria passar um afrouxamento geral da
  // regra da casa — que continua sendo "o tom vem do código" para quem não declara nada.
  test("o erro de um detalhe da tela não vira alarme, e a regra geral não afrouxa", async ({
    page,
  }) => {
    await montarProduto(page);
    await emProcessamento(page);
    await page.route("**/v1/analyses/*/progress**", (r) =>
      r.fulfill(json({ code: "temporarily_unavailable", retryable: true }, 503)),
    );
    await page.goto(`/analyses/${ANALISE}`);
    await expect(page.locator("main")).toContainText(/temporarily unavailable/i, { timeout: 30_000 });

    // O aviso do painel existe e NÃO é um alarme.
    const aviso = page.locator("main").getByText(/temporarily unavailable/i).first();
    expect(
      await aviso.evaluate((el) => Boolean(el.closest('[role="alert"]'))),
      "o detalhe do painel voltou a interromper como alarme",
    ).toBe(false);

    // A DIREÇÃO OPOSTA, na mesma montagem: a listagem inteira fora do ar continua sendo alarme.
    await page.route("**/v1/analyses**", (r) =>
      r.fulfill(json({ code: "temporarily_unavailable", retryable: true }, 503)),
    );
    await page.goto("/analyses");
    await expect(page.locator("main")).toContainText(/couldn't load|Try again/i, { timeout: 30_000 });
    expect(
      await page.locator('main [role="alert"]').count(),
      "a tela inteira fora do ar deixou de alarmar — a regra da casa foi afrouxada para todos",
    ).toBeGreaterThan(0);
  });

  // A TERCEIRA causa: enquanto a leitura NÃO VOLTOU.
  //
  // Antes da primeira resposta `data` também é `undefined`, e a tela afirmaria quatro "não medido"
  // ANTES de saber qualquer coisa. Com um produtor lento a afirmação falsa fica na tela o tempo
  // todo da espera — e é justamente quando ninguém está olhando um teste.
  test("carregando ≠ não medido no painel de progresso", async ({ page }) => {
    await montarProduto(page);
    await emProcessamento(page);
    await page.route("**/v1/analyses/*/progress**", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await r.fulfill(json({ analysis_id: ANALISE, axes: eixosDe("running") }));
    });
    await page.goto(`/analyses/${ANALISE}`);

    // Enquanto a resposta não chega, o painel diz que está LENDO — e não afirma medida nenhuma.
    await expect(page.locator("main")).toContainText(/Reading what each part is doing/i, {
      timeout: 15_000,
    });
    expect(
      await page.locator("main").innerText(),
      "a espera virou afirmação sobre os dados",
    ).not.toMatch(/Not measured/i);

    // E quando ela chega, a grade aparece: sem isto, esconder para sempre passaria.
    await expect(page.locator("main")).toContainText(/Running/i, { timeout: 20_000 });
  });

  // O CONTRAPROVA: com o produtor respondendo e um eixo sem entrada, "não medido" É a frase certa.
  // Sem este caso, esconder a grade sempre passaria nos dois acima.
  test("o produtor sem publicar um eixo CONTINUA sendo 'não medido'", async ({ page }) => {
    await montarProduto(page);
    await emProcessamento(page);
    await page.route("**/v1/analyses/*/progress**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ analysis_id: ANALISE, axes: [{ axis: "engine", state: "running" }] }),
      }),
    );
    await page.goto(`/analyses/${ANALISE}`);

    await expect(page.locator("main")).toContainText(/Not measured/i, { timeout: 20_000 });
    // E o eixo que o produtor PUBLICOU aparece com o estado dele, não engolido pela ausência.
    await expect(page.locator("main")).toContainText(/Running/i);
  });

  test("indisponível ≠ inexistente na Instância", async ({ page }) => {
    await montarProduto(page);
    await page.route("**/v1/instances/*", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      }),
    );
    await page.goto(`/instances/${INSTANCIA}`);

    await expect(page.locator("main")).toContainText(/unavailable right now/, { timeout: 20_000 });
    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto.length).toBeGreaterThan(20);
    expect(texto, "503 virou 'não encontrada'").not.toMatch(/couldn't find|not found/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G7 · a11y — axe e teclado em CADA superfície
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G7 · acessibilidade transversal", () => {
  for (const j of JOURNEYS) {
    test(`${j.id} · axe sem violação aplicável`, async ({ page }) => {
      await montarProduto(page);
      await j.montar?.(page);
      await page.goto(j.rota);
      await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });

      await page.addScriptTag({ content: axe.source });
      const resultado = await page.evaluate(async () => {
        const a = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
        return (await a.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
          violations: { id: string; nodes: unknown[] }[];
        };
      });
      const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
      expect(graves, `${j.id} · violações axe: ${graves.join(", ")}`).toEqual([]);
    });
  }

  test("teclado: o foco atravessa a navegação sem mouse", async ({ page }) => {
    await montarProduto(page);
    await page.goto("/dashboard/settings");
    await expect(page.locator("main")).toContainText(/Notifications/, { timeout: 15_000 });

    // Dez tabulações a partir do topo têm de alcançar algo focável e VISÍVEL — um foco que cai
    // em elemento oculto é armadilha de teclado, e não aparece em captura nenhuma.
    const alcançados: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press("Tab");
      const alvo = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, visivel: r.width > 0 && r.height > 0 };
      });
      if (alvo) {
        expect(alvo.visivel, `foco caiu em elemento invisível (${alvo.tag})`).toBe(true);
        alcançados.push(alvo.tag);
      }
    }
    expect(alcançados.length, "o teclado não alcançou nada").toBeGreaterThan(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G5 · responsive — três larguras, sem rolagem horizontal
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G5 · responsive", () => {
  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`${vp.nome}: nenhuma superfície estoura a largura`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montarProduto(page);

      const estouram: string[] = [];
      for (const j of JOURNEYS) {
        // A montagem base é REINSTALADA a cada journey.
        //
        // Este laço reusa UMA página, e `page.route` acumula: a última registrada vence e nunca é
        // desfeita. Sem isto, o `emEstado` de J12 (falha terminal) continuava valendo em J13–J16, e
        // J15 media RES-01 de uma análise que falhou — não a tela que o nome diz. G1 e G7 não têm
        // o problema porque cada caso abre uma página nova.
        await montarProduto(page);
        await j.montar?.(page);
        await page.goto(j.rota);
        await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });
        // Medido pela GEOMETRIA dos elementos, e não por `scrollWidth` do documento.
        //
        // O `AppShell` tem `overflow-x-hidden`: um elemento mais largo que a viewport é CLIPADO,
        // não vira rolagem, e `scrollWidth - clientWidth` fica em zero para sempre. O gate escrito
        // assim não podia falhar — a mutação 7 da campanha o provou, injetando `min-w-[2000px]` no
        // frame e passando verde. Medir a caixa de cada elemento pega o estouro real, que é o que
        // a pessoa vê: conteúdo cortado na borda.
        const excesso = await page.evaluate(() => {
          const largura = document.documentElement.clientWidth;
          let pior = 0;
          for (const el of Array.from(document.querySelectorAll("main *"))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            pior = Math.max(pior, Math.round(r.right - largura));
          }
          return pior;
        });
        if (excesso > 1) estouram.push(`${j.id} (${excesso}px)`);
      }
      expect(estouram, `${vp.nome} com rolagem horizontal`).toEqual([]);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G6 · PT e EN, provados pelo CONTEÚDO
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G6 · idioma provado pelo conteúdo", () => {
  for (const idioma of ["en", "pt"] as const) {
    test(`${idioma}: a preferência da CONTA decide, e o conteúdo prova`, async ({ page }) => {
      await montarProduto(page, idioma);
      await page.goto("/dashboard/settings");

      // Frases que existem em UM locale só. Nada de `localStorage` — foi a dívida da M40: doze
      // capturas rotuladas EN que renderizaram em inglês por acidente de setup.
      const marca = idioma === "en" ? /Password and sign-in/ : /Senha e acesso/;
      const oposta = idioma === "en" ? /Senha e acesso/ : /Password and sign-in/;

      await expect(page.locator("main")).toContainText(marca, { timeout: 15_000 });
      expect(await page.locator("main").getByText(oposta).count(), "os dois idiomas na mesma tela")
        .toBe(0);
    });

    test(`${idioma}: a visão ARGOS também fala o idioma da conta`, async ({ page }) => {
      // M45.4 — `ARG-01` é superfície REAL e nunca teve prova de idioma. A `two-view.spec` não
      // consegue dá-la: a montagem dela (sessionStorage + bypass) não faz o reconciliador
      // resolver, e eu tentei duas vezes antes de aceitar isso. Aqui a montagem é a do produto
      // inteiro, que já comprova troca de idioma nas outras seis journeys.
      //
      // A âncora é o estado de INDISPONIBILIDADE do documento ARGOS — ele é i18n, é o que esta
      // montagem produz (não semeia v3), e é terminal. Provar idioma pelo caminho feliz exigiria
      // semear o documento, que é justamente o que quebrou a outra tentativa.
      await montarProduto(page, idioma);
      await page.goto(`/analyses/${ANALISE}/argos`);

      const esperado =
        idioma === "en"
          ? /ARGOS document is not available|no ARGOS document/i
          : /documento ARGOS|não tem documento/i;
      const oposto =
        idioma === "en" ? /documento ARGOS/i : /ARGOS document is not available/i;

      await expect(page.locator("main")).toContainText(esperado, { timeout: 15_000 });
      const texto = await page.locator("main").innerText();
      expect(texto.length, "tela vazia tornaria a negativa trivial").toBeGreaterThan(40);
      expect(texto, "os dois idiomas na mesma tela").not.toMatch(oposto);
    });
  }
});
