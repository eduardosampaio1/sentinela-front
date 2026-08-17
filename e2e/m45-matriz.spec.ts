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
/** O outro lado da comparação (J35) — precisa ser um id DIFERENTE, ou a tela compara uma consigo. */
const ANALISE_B = "an-7b41d9a2-6c58-4e17-b30f-2a95c81de743";
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

/**
 * M45.5 — a Instância com CONTEÚDO: histórico e régua de baseline.
 *
 * J3 e J4 montam a lista e a Instância VAZIAS, e a discovery já dizia o que faltava: *"não
 * cobriram baseline, histórico paginado, nem `/analyses/new` a partir dela"*. Tela vazia não tem
 * régua para desenhar, nem histórico para paginar, nem candidato para escolher.
 */
async function instanciaComConteudo(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === "/v1/instances",
    (r) =>
      r.fulfill(
        json({
          items: [
            { instance_id: INSTANCIA, name: "Suporte", created_at: "2026-05-02T11:15:00Z" },
            { instance_id: "inst-2", name: "Vendas", created_at: "2026-06-10T09:00:00Z" },
          ],
          next_cursor: null,
        }),
      ),
  );
  // O histórico da Instância É a listagem canônica filtrada — não há subrecurso `/instances/{id}/
  // analyses`, e a BD02 recusou criá-lo de propósito.
  await page.route(
    (url) => url.pathname === "/v1/analyses",
    (r) =>
      r.fulfill(
        json({
          items: [
            { analysis_id: ANALISE, status: "completed", record_count: 1240, result_available: true, created_at: "2026-08-03T17:12:44Z", updated_at: "2026-08-03T17:13:02Z", instance_id: INSTANCIA },
            { analysis_id: "an-anterior", status: "completed", record_count: 900, result_available: true, created_at: "2026-07-20T10:00:00Z", updated_at: "2026-07-20T10:06:00Z", instance_id: INSTANCIA },
          ],
          next_cursor: null,
        }),
      ),
  );
  await page.route("**/v1/instances/*/baseline**", (r) =>
    r.fulfill(
      json({
        instance_id: INSTANCIA,
        baseline_analysis_id: ANALISE,
        baseline_set_at: "2026-08-04T08:00:00Z",
      }),
    ),
  );
}

/**
 * A Instância sem NENHUM candidato a referência.
 *
 * Distinto de "sem referência escolhida": aqui não há o que escolher. Só análises concluídas desta
 * Instância podem ser régua, e a elegibilidade tem dono — o produtor, pelo `baseline_eligible`.
 */
async function instanciaSemCandidatos(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === "/v1/analyses",
    (r) => r.fulfill(json({ items: [], next_cursor: null })),
  );
  await page.route("**/v1/instances/*/baseline**", (r) =>
    r.fulfill(json({ instance_id: INSTANCIA, baseline_analysis_id: null, baseline_set_at: null })),
  );
}

/**
 * Concluída e SEM resultado — o próprio status diz que não há.
 *
 * Não confundir com `semResultado`: lá o status anuncia `result_available: true` e o documento foi
 * levado pela retenção. Aqui nunca houve o que anunciar, e a tela diz outra coisa.
 */
async function concluidaSemResultado(page: Page): Promise<void> {
  await page.route("**/v1/analyses/*", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        status: "completed",
        record_count: 1240,
        result_available: false,
        retry_allowed: false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    ),
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
  /**
   * A região que esta journey mede — M45.7.
   *
   * O padrão é `main`, e ele é uma exigência: uma superfície do produto sem landmark principal
   * deixa quem usa leitor de tela sem "pular para o conteúdo". As públicas de hoje NÃO têm `main`,
   * e isso está contado abaixo em vez de escondido: medir pelo `body` aqui é a diferença entre
   * *"não medimos"* e *"medimos, e falta o landmark"*.
   */
  readonly regiao?: "main" | "body";
  /**
   * Violações de axe PRÉ-EXISTENTES nesta superfície — M45.7.
   *
   * `toBe`, e não `toBeLessThan`: o número não pode crescer **nem encolher em silêncio**. Se
   * alguém corrigir contraste, o gate reprova até o número descer no mesmo commit — que é a mesma
   * catraca do anti-monólito, e é o que impede a dívida de virar paisagem.
   *
   * Sem ele eu teria duas opções ruins: deixar a matriz vermelha para sempre, ou tirar as públicas
   * dela — voltando ao NO CREDIT que esta tranche existe para acabar.
   */
  readonly axeConhecido?: number;
}

/**
 * Desfaz a sessão que `montarProduto` instala — M45.7.
 *
 * Os `addInitScript` rodam na ORDEM de registro a cada navegação, então este apaga a bandeira que
 * o anterior põe. Não é "montar diferente": é a única forma de alcançar as superfícies de entrada,
 * que o produto esconde de quem já entrou.
 */
const semSessao = async (page: Page) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__;
  });
};

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

  // O estado que a M45.3 descobriu ao desfazer um julgamento errado, e que ficou de fora daquela
  // rodada. Decisão de owner (2026-08-15): medir agora.
  //
  // É DIFERENTE de J16. Ali o status anuncia `result_available: true` e o documento foi levado
  // pela retenção; aqui o próprio status diz que não há resultado. Duas telas, duas frases.
  { id: "J17", nome: "concluída sem resultado", rota: `/analyses/${ANALISE}/result`,
    terminal: /still being prepared|ainda está sendo preparado/, montar: concluidaSemResultado },

  // ── M45.5 · Instância e baseline, POVOADAS ───────────────────────────────────────────────
  //
  // J3 e J4 pousam nas mesmas rotas VAZIAS. A discovery nomeou o que faltava: baseline, histórico
  // paginado e a entrada de nova análise a partir da Instância.
  { id: "J18", nome: "instâncias povoadas", rota: "/instances",
    terminal: /Suporte/, montar: instanciaComConteudo },
  { id: "J19", nome: "instância com régua", rota: `/instances/${INSTANCIA}`,
    // "Referência atual" só existe com uma análise ELEITA — é o estado que a M40 entregou e que
    // nenhuma passada transversal tinha visto.
    terminal: /Current reference|Referência atual/, montar: instanciaComConteudo },
  { id: "J20", nome: "instância sem candidatos", rota: `/instances/${INSTANCIA}`,
    terminal: /No analysis can be the reference yet|Nenhuma análise pode ser referência/,
    montar: instanciaSemCandidatos },

  // ── M45.7 · público e auth — E13 e E14, as duas com NO CREDIT ────────────────────────────
  //
  // A discovery foi literal: *"fora da matriz"*. São as primeiras telas que qualquer pessoa vê, e
  // as únicas que alguém alcança sem sessão — e nenhuma passada transversal as tinha visitado.
  //
  // A montagem do produto não atrapalha: o bypass de auth é `addInitScript`, e estas rotas não
  // dependem dele. O que muda é que elas não têm o shell autenticado, então o gate mede o que
  // elas TÊM.
  // J23 e J24 são as duas superfícies que SÓ existem sem sessão — achado desta tranche.
  //
  // Montadas como as outras, as duas renderizavam a HOME: quem está autenticado e pede `/login` ou
  // `/session-expired` é mandado para dentro do produto. Isso está CERTO — mostrar a porta a quem
  // já entrou seria o defeito —, e significa que medi-las exige desfazer a sessão.
  //
  // Sem isto, as duas passariam medindo a Home: dois nomes, uma tela. É a mesma classe de defeito
  // que o gate de evidência da M45.6 pegou em `docs/`, aqui na matriz.

  // Os três números abaixo são o ACHADO da M45.7, não um relaxamento dela: nenhuma das três tem
  // `<main>`, e o contraste está reprovado. Estavam assim ANTES desta tranche — a diferença é que
  // agora estão contados, e a catraca reprova se piorarem.
  // J21: 6 → 13 na troca de paleta, e a composição está aberta abaixo porque um número sozinho
  // esconderia que a maior parte não é defeito.
  //
  // A base do sistema CLAREOU (#09090b → #12161D). As cores que não são nossas — a marca de cada
  // fornecedor de LLM no monograma — não podiam ser trocadas, e perderam contraste contra o fundo
  // novo. São nove, todas `aria-hidden`, e a WCAG 1.4.3 isenta logotipo de piso de contraste; o
  // arquivo já documentava isso antes desta missão. Mais duas marcas d'água decorativas de 72px,
  // também `aria-hidden` e `pointer-events-none`, deliberadamente quase invisíveis.
  //
  //   11 nós  `aria-hidden`  logotipo de fornecedor + marca d'água   ISENTOS por norma
  //    2 nós  visíveis       rótulo mono de 8px em cor de sinal      DÍVIDA REAL, 4,04 e 4,10
  //
  // Os dois últimos são dívida, não isenção, e ficam nomeados: texto de sinal dentro de chip
  // tingido pela cor do fornecedor. Persegui-los trocando tom já rendeu 17 → 13 (os cinco de
  // `text-muted` cederam ao subir para `text-secondary`); estes dois precisam de decisão sobre um
  // quarto papel de texto medido contra superfície TINGIDA, que é design e não remendo.
  //
  // O que FOI corrigido nesta tranche, e era o caro: branco sobre o acento novo em dois CTAs, a
  // 3,04:1. Controle real, texto real, reprovando AA na primeira dobra da landing.
  { id: "J21", nome: "landing pública", rota: "/", axeConhecido: 13,
    terminal: /Do you know if it's working|Você sabe se ela está funcionando/ },
  { id: "J22", nome: "termos de uso", rota: "/terms",
    terminal: /Acceptance of terms|Aceitação dos termos/ },
  // 2 de contraste + 1 `link-in-text-block`: "Create one" tem 2.06:1 contra o texto ao redor, e a
  // regra existe porque link que só se distingue por cor some para quem não distingue essa cor.
  { id: "J23", nome: "entrada", rota: "/login", montar: semSessao,
    terminal: /Enter your analysis workspace|Entre no seu espaço/ },
  { id: "J24", nome: "sessão expirada", rota: "/session-expired", montar: semSessao,
    // O estado que a M14 entregou e que nenhuma passada transversal viu: a sessão caiu, e a tela
    // diz que os dados continuam salvos — a diferença entre perder a sessão e perder o trabalho.
    terminal: /Session expired|Sessão expirada/ },

  // ─────────────────────────────────────────────────────────────────────────────────────────
  // M45.8 — as OUTRAS quinze rotas.
  //
  // A M45.7 fechou dizendo que as públicas estavam medidas. Estavam quatro delas. O gate de
  // cobertura desta tranche (`src/test/v1/matriz-cobre-o-router.test.ts`) leu o router e mostrou
  // que a matriz visitava 24 das 39 rotas — e que as não visitadas guardavam DOBRO da dívida das
  // visitadas: 105 nós contra 54.
  //
  // A pior não é de marketing. `/profile` é superfície de produto, autenticada, e tem 6.
  // ─────────────────────────────────────────────────────────────────────────────────────────

  // 76 nós num só lugar — o maior bolsão de dívida de a11y do produto inteiro.
  { id: "J25", nome: "AION (produto irmão)", rota: "/aion",
    montar: semSessao, terminal: /The proxy that thinks/ },
  // Os três documentos legais somam 27 (8 + 10 + 9): é UM template com um defeito, contado três
  // vezes. Corrigir o token do template baixa os três de uma vez.
  { id: "J26", nome: "política de privacidade", rota: "/privacy",
    terminal: /How we collect, use, and protect|Who we are/ },
  { id: "J27", nome: "segurança", rota: "/security",
    terminal: /How we protect your data/ },
  { id: "J28", nome: "criar conta", rota: "/register", montar: semSessao,
    terminal: /Redirecting to account creation/ },
  { id: "J29", nome: "recuperar senha", rota: "/forgot-password", montar: semSessao,
    terminal: /Redirecting to password reset/ },
  // A única DENTRO do produto, e por isso a mais séria das oito.
  { id: "J30", nome: "perfil", rota: "/profile",
    terminal: /Your account identity and security settings/ },
  { id: "J31", nome: "erro do servidor", rota: "/error",
    terminal: /An unexpected server error occurred/ },
  // 404 é superfície: é onde cai todo link quebrado, e o texto promete que as análises seguem
  // intactas — a mesma distinção entre perder o caminho e perder o trabalho que J24 faz.
  { id: "J32", nome: "página inexistente", rota: "/rota-que-nao-existe",
    terminal: /This page doesn't exist/ },

  // AS DUAS VISÕES QUE DÃO NOME À UMBRELLA — e que a umbrella nunca pôs na própria matriz.
  //
  // A M45 se chama *Two-View Hardening*. A M45.4 mediu ARGOS e Analytics com suítes próprias, e a
  // matriz transversal — o instrumento que pergunta se as features formam UMA experiência — nunca
  // as visitou. O gate de cobertura da M45.8 acusou, e é o achado que fecha a umbrella.
  // A montagem base serve um documento **v2**, e a visão ARGOS é v3-only. O terminal dela aqui é
  // portanto a RECUSA — e a recusa é a tela mais importante desta visão: ela diz que veio outra
  // espécie de leitura, que esta janela só mostra ARGOS, e que o resultado histórico continua lá.
  // Ausência NOMEADA, com saída. É o oposto exato do colapso que o G11 persegue no resto do produto.
  { id: "J33", nome: "visão ARGOS (v2 → recusa nomeada)", rota: `/analyses/${ANALISE}/argos`,
    terminal: /The ARGOS document is not available for this analysis/ },
  { id: "J34", nome: "visão Analytics", rota: `/analyses/${ANALISE}/analytics`,
    terminal: /Numeric measures/ },

  // A DÍVIDA DE COBERTURA que a M45.8 declarou, paga na M46.
  //
  // Ela ficou de fora com o motivo "tem suíte própria" — e a M45.8 existe justamente porque suíte
  // própria não substitui a passada transversal: foi assim que `/argos` e `/analytics` sumiram.
  // Deixá-la fora seria repetir o argumento que a tranche anterior refutou.
  //
  // Como em J33, a montagem base serve **v2** e a comparação exige ARGOS dos dois lados: o
  // terminal é a recusa nomeada, que diz o que falta e para onde ir.
  { id: "J35", nome: "comparação (v2 → recusa nomeada)",
    rota: `/analyses/compare/${ANALISE}/${ANALISE_B}`,
    terminal: /One side has no ARGOS document|Um dos lados não tem documento ARGOS/ },
] as const;

/**
 * A região que os gates transversais medem nesta journey.
 *
 * `main` é o padrão E a exigência. Cair para `body` é uma DECLARAÇÃO de que aquela superfície não
 * tem landmark principal — e o gate G1-bis, logo abaixo, garante que a declaração seja rara e
 * nomeada, em vez de virar o caminho fácil para calar o gate.
 */
const regiaoDe = (j: Journey) => j.regiao ?? "main";

// ══════════════════════════════════════════════════════════════════════════════════════════
// G1-bis · a exceção não pode virar o caminho fácil — M45.7
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// `regiao: "body"` e `axeConhecido` são escapes: quem adicionar uma journey nova pode usá-los para
// calar o gate em vez de corrigir a tela. Este teste nomeia quem hoje os usa e trava o total.
//
// É a catraca da catraca. Sem ele, a M45.7 teria entregado uma matriz que aceita qualquer
// superfície nova quebrada, desde que a pessoa escreva o número da própria quebra.
test.describe("M45 · G1-bis · a dívida declarada é nominal e não cresce", () => {
  test("só as superfícies públicas conhecidas declaram dívida", () => {
    expect(
      JOURNEYS.filter((j) => j.regiao === "body").map((j) => j.id),
      "uma journey NOVA sem `<main>`: adicione o landmark em vez de declarar `regiao: \"body\"`",
    // VAZIO — M46.
    //
    // As oito superfícies que declaravam `regiao: "body"` ganharam `<main>`. A lista chegou a ter
    // oito nomes; hoje ela é a prova de que a catraca serviu para o que foi feita: baixar, não
    // acomodar. Uma entrada nova aqui reprova.
    ).toEqual([]);

    expect(
      JOURNEYS.filter((j) => (j.axeConhecido ?? 0) > 0).map((j) => j.id),
      "uma journey NOVA com violação de a11y declarada: corrija a tela, não o gate",
    ).toEqual(["J21"]);

    // O TETO ABSOLUTO da dívida de a11y do produto inteiro — 159 na M45.8, **6** desde a M46.
    //
    // Como os 153 caíram, e por que foi barato: quase tudo era TOKEN, não tela.
    //
    //   `A.muted` no AION .................. 76 → 0   (uma linha; 3.32:1 → 5.22:1)
    //   `L.*` no template legal ............ 27 → 0   (um template servindo três documentos)
    //   `C.ghost` + `C.subtle` na landing .. 26 → 0
    //   `#475569` em perfil/erro/404 ....... 10 → 0   (o mesmo cinza em três arquivos)
    //   `C.red`/`C.amber`/`C.accentBr` ..... 11 → 0   (cores de status usadas como texto de 9px)
    //   entrada, "Step N", separador ........ 3 → 0
    //
    // OS 6 QUE FICAM, e por que ficam:
    //
    //   3 · o numeral-fantasma dos cards de passo (`rgba(255,255,255,0.025)`, 72px). É TEXTURA:
    //       a 1.04:1 ninguém o lê, e é esse o efeito. O número aparece legível logo abaixo, em
    //       "Step N". Corrigi-lo seria desenhar outra coisa, não corrigir esta.
    //   3 · os monogramas de marca dos fornecedores de LLM (`#1877F2` Meta, `#4E6EF2` DeepSeek,
    //       `#8B6CF7` Qwen). A WCAG 1.4.3 isenta logotipo de piso de contraste, e o nome do modelo
    //       está escrito ao lado, legível.
    //
    // Os dois grupos são `aria-hidden` — o leitor de tela não os anuncia. Mas continuam CONTADOS:
    // isenção da norma não é motivo para parar de medir, e um dia alguém vai querer saber por que
    // este número não é zero. A resposta está escrita aqui, e não numa decisão esquecida.
    expect(
      JOURNEYS.reduce((soma, j) => soma + (j.axeConhecido ?? 0), 0),
      "o total de dívida de a11y declarada mudou",
    // 6 -> 13 na troca de paleta. A composicao esta na declaracao do J21, e o resumo e: a base do
      // sistema clareou, as cores de marca dos fornecedores nao sao nossas para trocar, e mais duas
      // cruzaram o piso. Onze dos treze sao `aria-hidden` e isentos por norma; dois sao divida real,
      // nomeada, de rotulo mono de 8px em chip tingido.
      //
      // O que a troca CORRIGIU e nao aparece neste numero: branco sobre o acento novo em dois CTAs,
      // a 3,04:1 — controle real reprovando AA na primeira dobra.
      ).toBe(13);
  });

  // A catraca do MARCADOR de estouro — M46.
  //
  // `data-overflow-ok` desliga o gate de responsive num subárvore inteira. Isso é poderoso demais
  // para ficar sem contagem: bastaria salpicá-lo para o G5 parar de medir o produto.
  //
  // O teste conta os marcadores no CÓDIGO-FONTE, e não no DOM: no DOM eles seriam contados apenas
  // nas páginas visitadas, e o furo estaria justamente em quem não é visitado.
  test("o marcador de estouro intencional é nominal e não se espalha", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join, resolve } = await import("node:path");

    // `process.cwd()`, e não `__dirname`: esta suíte roda como ESM, onde `__dirname` não existe.
    // O Playwright executa a partir da raiz do projeto (onde vive o config).
    const raiz = resolve(process.cwd(), "src");
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) varrer(caminho);
        else if (/\.tsx?$/.test(nome)) {
          for (const m of readFileSync(caminho, "utf-8").matchAll(/data-overflow-ok="([^"]+)"/g)) {
            achados.push(`${nome}:${m[1]}`);
          }
        }
      }
    };
    varrer(raiz);

    expect(achados.length, "o extrator não achou nenhum marcador — regex quebrada?").toBeGreaterThan(0);
    expect(
      achados.sort(),
      "um `data-overflow-ok` NOVO: prove que a largura é intencional (a página não pode rolar na " +
        "horizontal) e adicione aqui, ou conserte o layout",
    ).toEqual(["secoes-problema.tsx:orbe-decorativo", "topo.tsx:marquee"]);
  });
});

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
      await expect(page.locator(regiaoDe(j))).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(regiaoDe(j))).toContainText(j.terminal, { timeout: 15_000 });

      const texto = await page.locator(regiaoDe(j)).innerText();
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

  // M45.5 — o histórico VAZIO não repete o título da seção.
  //
  // A seção já tem `<h2>Análises desta instância</h2>`, e o estado vazio usava o MESMO texto como
  // título: dois títulos idênticos empilhados na tela, e dois cabeçalhos iguais na árvore de
  // acessibilidade. Quem navega por cabeçalho ouvia a mesma coisa duas vezes sem saber que a
  // segunda era o vazio. O mesmo valia para o estado de erro.
  //
  // O gate CONTA — sem contar, "o título existe" passaria com ele duplicado.
  test("o histórico vazio não empilha dois títulos iguais", async ({ page }) => {
    await montarProduto(page);
    await instanciaSemCandidatos(page);
    await page.goto(`/instances/${INSTANCIA}`);
    await expect(page.locator("main")).toContainText(/No analyses in this instance yet/, {
      timeout: 20_000,
    });

    const titulos = await page
      .locator("main")
      .getByText("Analyses in this instance", { exact: true })
      .count();
    expect(titulos, "o título da seção aparece mais de uma vez").toBe(1);
  });

  // M45.3 · decisões de owner (2026-08-15) sobre a superfície CONGELADA.
  //
  // A primeira ATRAVESSA o T7 do Product Freeze, com emenda registrada lá: quem chega por deep
  // link antigo passa a ver as entradas das duas leituras atuais da mesma Analysis. Sem isto, o
  // link servia indefinidamente alguém que nunca conheceria a substituta.
  test("o resultado legado oferece as duas leituras atuais da MESMA análise", async ({ page }) => {
    await montarProduto(page);
    await page.goto(`/analyses/${ANALISE}/result`);
    await expect(page.locator("main")).toContainText(/Why trust this result/, { timeout: 20_000 });

    // Os HREFS, e não só os rótulos: um link com o texto certo e o destino errado passaria.
    for (const visao of ["argos", "analytics"]) {
      await expect(
        page.locator("main").locator(`a[href="/analyses/${ANALISE}/${visao}"]`),
        `o resultado legado não oferece a visão ${visao} desta análise`,
      ).toHaveCount(1);
    }
  });

  // A segunda: o aviso de documento levado pela retenção não gira mais uma rodinha.
  test("resultado purgado NÃO anuncia progresso — nada mais vem", async ({ page }) => {
    await montarProduto(page);
    await semResultado(page);
    await page.goto(`/analyses/${ANALISE}/result`);
    await expect(page.locator("main")).toContainText(/No result is available/, { timeout: 20_000 });

    // `aria-busy` é o que um leitor de tela ouve como "esta região está atualizando".
    const aviso = page.locator("main").getByText(/No result is available/).first();
    expect(
      await aviso.evaluate((el) => el.closest('[aria-busy="true"]') !== null),
      "a tela anuncia que algo está em curso, e a análise já terminou",
    ).toBe(false);
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
      await expect(page.locator(regiaoDe(j))).toContainText(j.terminal, { timeout: 15_000 });

      await page.addScriptTag({ content: axe.source });
      const resultado = await page.evaluate(async () => {
        const a = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
        return (await a.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
          violations: { id: string; nodes: unknown[] }[];
        };
      });
      const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
      const nos = resultado.violations.reduce((soma, v) => soma + v.nodes.length, 0);

      // `toBe`, e não `toBeLessThanOrEqual` — M45.7.
      //
      // O número tem de bater EXATO nos dois sentidos. Crescer reprova, que é o óbvio; encolher
      // também reprova, e é isso que impede a dívida de virar paisagem: quem corrigir contraste é
      // obrigado a baixar o número no mesmo commit, e o diff passa a exibir a correção.
      //
      // Com `toBeLessThanOrEqual` eu teria escrito um gate que NÃO PODE FALHAR por melhora, e o
      // programa já pagou por um desses.
      expect(
        nos,
        `${j.id} · axe mudou: ${graves.join(", ") || "nenhuma"} — esperado ${j.axeConhecido ?? 0} nó(s). ` +
          `Se você CORRIGIU, baixe o número em \`axeConhecido\`. Se subiu, a superfície regrediu.`,
      ).toBe(j.axeConhecido ?? 0);
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
        await expect(page.locator(regiaoDe(j))).toContainText(j.terminal, { timeout: 15_000 });
        // Medido pela GEOMETRIA dos elementos, e não por `scrollWidth` do documento.
        //
        // O `AppShell` tem `overflow-x-hidden`: um elemento mais largo que a viewport é CLIPADO,
        // não vira rolagem, e `scrollWidth - clientWidth` fica em zero para sempre. O gate escrito
        // assim não podia falhar — a mutação 7 da campanha o provou, injetando `min-w-[2000px]` no
        // frame e passando verde. Medir a caixa de cada elemento pega o estouro real, que é o que
        // a pessoa vê: conteúdo cortado na borda.
        // M46 — DOIS achados aqui, e o segundo é sobre este gate.
        //
        // 1. Ele varre `main *`. Oito superfícies NÃO TINHAM `<main>` até esta tranche, então para
        //    elas o laço percorria ZERO elementos e o gate passava por vacuidade. A landing entrou
        //    em responsive pela primeira vez agora — e acusou 2947px.
        //
        // 2. Os 2947px NÃO eram defeito. `document.scrollWidth - clientWidth` é **0** nas três
        //    larguras: a página não rola. São a esteira de modelos (largura `max-content`, animada
        //    dentro de um contêiner que recorta) e orbes de blur posicionados de propósito para
        //    fora do card. Fora da esteira, o estouro real é 0px no desktop.
        //
        // A saída NÃO foi "ignorar quem tem ancestral que recorta": isso reabriria exatamente o
        // buraco que motivou medir geometria — no AppShell, um `min-w-[2000px]` TAMBÉM tem um
        // ancestral que recorta, e a mutação que injetou isso passaria verde de novo.
        //
        // A saída é um marcador EXPLÍCITO, como `FORA_DA_MATRIZ`: quem sabe que a largura é
        // intencional escreve isso no elemento, e o gate continua estrito para todo o resto.
        const excesso = await page.evaluate(() => {
          const largura = document.documentElement.clientWidth;
          let pior = 0;
          /**
           * O elemento está dentro de algo que a PESSOA consegue rolar, e que cabe na tela?
           *
           * `overflow-x: auto|scroll` e `overflow-x: hidden` parecem iguais no cálculo e são
           * opostos na experiência: com `auto` o conteúdo continua ALCANÇÁVEL (é o padrão certo
           * para bloco de código, que não deve quebrar linha); com `hidden` ele é cortado em
           * silêncio, e foi assim que o `AppShell` escondeu quebras reais.
           *
           * Por isso só `auto|scroll` isenta — e `hidden` continua reprovando.
           */
          const alcancavel = (el: Element) => {
            let p = el.parentElement;
            while (p) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === "auto" || ox === "scroll") {
                if (p.getBoundingClientRect().right - largura <= 1) return true;
              }
              p = p.parentElement;
            }
            return false;
          };

          for (const el of Array.from(document.querySelectorAll("main *"))) {
            if (el.closest("[data-overflow-ok]")) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            if (alcancavel(el)) continue;
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
