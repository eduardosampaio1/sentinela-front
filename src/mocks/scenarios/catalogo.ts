// M18 — o CATÁLOGO canônico dos cenários de mock.
//
// ## Por que o catálogo tem 32 entradas e não 27
//
// O Blueprint §11 lista **32**. Destes, **27 são executáveis**, **1 é parcial** (`needs-mapping`:
// exibir sim, resolver não) e **4 estão BLOQUEADOS** por delta de backend que não existe.
//
// Os 5 não-executáveis ficam aqui, declarados, em vez de sumirem da lista. Um catálogo que só
// mostra o que funciona faz o que falta parecer inexistente — e é assim que alguém "descobre",
// três meses depois, que a tela de Instância nunca teve como ser montada.
//
// ## A regra que dá sentido a isso
//
// **Nenhuma fixture é inventada para os bloqueados.** Um mock que devolvesse um `instance` ou um
// `recommendation_id` plausível faria a tela montar, a demo funcionar e o delta de backend
// parecer feito. O bloqueio existe para ser visível, então pedir um bloqueado **lança** com a
// razão — não devolve vazio, não devolve "quase".
//
// Ausência ≠ zero · partial ≠ failed · withheld ≠ erro · delta ≠ drift.

import { http, HttpResponse } from "msw";
import type { HttpHandler } from "msw";
import type {
  AnalyticsAxisState,
  EngineAxisState,
  ExportAxisState,
  FinalResultAxisState,
} from "@/lib/v1";
import {
  HANDLE,
  LIST_PAGE_1,
  LIST_PAGE_2,
  RESULT_VIEW,
  problem,
  statusView,
} from "@/test/fixtures/public-v1/analyses";

export type EstadoDoScenario = "disponivel" | "parcial" | "bloqueado";

export interface Scenario {
  /** Nome estável e único. É por ele que o cenário é invocado. */
  readonly id: string;
  /** Superfícies do Blueprint que ele alimenta. */
  readonly superficies: readonly string[];
  readonly estado: EstadoDoScenario;
  /**
   * Obrigatória em `bloqueado` e `parcial`. É o que a pessoa lê quando pede o cenário e ele
   * recusa — e é a diferença entre "não funciona" e "não existe ainda, por este motivo".
   */
  readonly razao?: string;
  /** Ausente em `bloqueado`, de propósito: não há o que servir sem inventar. */
  readonly handlers?: (base: string) => HttpHandler[];
}

const json = (b: unknown, s = 200) => HttpResponse.json(b as Record<string, unknown>, { status: s });

/** Envelope problem+json, do catálogo canônico do cliente — não redigitado aqui. */
const erro = (base: string, rota: string, status: number, code: Parameters<typeof problem>[0]) =>
  http.get(`${base}${rota}`, () => json(problem(code), status));

const status1 = (base: string, s: Parameters<typeof statusView>[0]) =>
  http.get(`${base}/v1/analyses/:id`, () => json(statusView(s)));

/**
 * Progresso por eixo — TIPADO por eixo, desde a M34.
 *
 * A assinatura era `Record<string, string>`, e é exatamente o *"`estado: string` comum"* contra o
 * qual a M20 escreveu a união discriminada: ela aceita qualquer nome de eixo com qualquer estado.
 * O resultado foi `export: "pending"` em SETE scenarios — um estado que o eixo `export` não tem
 * (`unavailable · preparing · ready · expired · failed · unknown`), renderizado como
 * "Exportação — Pendente" nas capturas da AN-03.
 *
 * Agora cada eixo carrega o seu próprio vocabulário e o compilador recusa o impossível. O mock
 * deixa de poder expressar aquilo que o produtor público não pode publicar — que é a única forma
 * de o defeito não voltar. Nenhum tipo foi afrouxado para acomodar o catálogo; foi o catálogo que
 * se ajustou ao contrato.
 */
const progresso = (
  base: string,
  eixos: {
    engine: EngineAxisState;
    analytics: AnalyticsAxisState;
    export: ExportAxisState;
    final_result: FinalResultAxisState;
  },
) =>
  http.get(`${base}/v1/analyses/:id/progress`, () =>
    json({
      analysis_id: "an-abc",
      axes: Object.entries(eixos).map(([axis, state]) => ({ axis, state })),
    }),
  );

const analytics = (base: string, corpo: Record<string, unknown>) =>
  http.get(`${base}/v1/analyses/:id/analytics`, () => json({ analysis_id: "an-abc", ...corpo }));

/**
 * O catálogo. A ordem é a do Blueprint §11 — mantê-la é o que permite conferir os dois lado a
 * lado sem traduzir numeração.
 */
export const CATALOGO: readonly Scenario[] = [
  {
    id: "workspace-empty",
    superficies: ["WS-01"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/me`, () => json({ user: { id: "u-1", email: "a@b.test", name: "A" }, workspaces: [], capabilities: { canonical_analysis_enabled: true } }))],
  },
  {
    id: "instance-empty",
    superficies: ["INST-01"],
    // Desbloqueado pela BD02 (`FREEZE: PASS`, B3 fechado). A razão do bloqueio nomeava três
    // ausências — operação, read model e campo — e as três acabaram: `create_instance`/
    // `list_instances`/`get_instance` estão no contrato público, `instance_read_model_fields`
    // existe, e `instance_id` entrou nas projeções de Analysis.
    //
    // O vazio aqui NÃO é fixture inventada: é a resposta que o produtor real devolve para
    // workspace autorizado sem Instances, medida por Gateway real em
    // `sentinela-facts/scripts/gate_bd02_instancia_e2e.py`.
    //
    // Workspace AUTORIZADO e sem Instances, e não workspace alheio: o alheio devolveria
    // `forbidden_or_not_found`, que mede autorização e não lista vazia. A primeira versão
    // daquele gate confundiu as duas coisas e ficou vermelha com razão.
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances`, () => json({ items: [], next_cursor: null })),
    ],
  },
  {
    id: "analysis-uploading",
    superficies: ["AN-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.post(`${b}/v1/analyses`, () => json(HANDLE, 201)),
      http.post(`${b}/v1/analyses/:id/data`, () => json(statusView("receiving"))),
    ],
  },
  {
    id: "upload-invalid",
    superficies: ["AN-01"],
    estado: "disponivel",
    handlers: (b) => [http.post(`${b}/v1/analyses/:id/data`, () => json(problem("invalid_input"), 400))],
  },
  {
    id: "upload-network-failure",
    superficies: ["AN-01"],
    estado: "disponivel",
    // Falha de TRANSPORTE, não envelope de erro: a distinção importa porque uma é retomável pelo
    // mesmo caminho e a outra consumiu a operação.
    handlers: (b) => [http.post(`${b}/v1/analyses/:id/data`, () => HttpResponse.error())],
  },
  {
    id: "needs-mapping",
    superficies: ["AN-02", "HOME-01"],
    estado: "parcial",
    razao:
      "EXIBIR sim, RESOLVER não. O estado `needs_mapping` é público e chega no status; a operação " +
      "que o resolve (`POST /ingestions/{id}/profile` + `/mapping`) NÃO está exposta no contrato " +
      "público nem tem ponte `analysis_id ↔ ingestion_id`. É o B2.",
    handlers: (b) => [status1(b, "needs_mapping")],
  },
  { id: "engine-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "running", analytics: "pending", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "running", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-ready-engine-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "running", analytics: "ready", export: "unavailable", final_result: "pending" })] },
  { id: "engine-ready-analytics-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "running", export: "unavailable", final_result: "pending" })] },
  {
    id: "analytics-partial",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `partial` NÃO é `failed`: parte mediu, parte não. A tela precisa poder dizer as duas coisas.
    handlers: (b) => [analytics(b, { component_status: "partial", snapshot: { blocos: [] }, withheld: null })],
  },
  {
    id: "analytics-withheld",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `withheld` NÃO é erro: a medida existe e foi RETIDA por regra de privacidade.
    handlers: (b) => [analytics(b, { component_status: "withheld", snapshot: null, withheld: { reason_code: "min_group_size" } })],
  },
  { id: "engine-failed-analytics-ready", superficies: ["AN-04", "RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "failed", analytics: "ready", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-failed-engine-ready", superficies: ["AN-04", "RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "failed", export: "unavailable", final_result: "pending" })] },
  // M35 — o único scenario que publica o STATUS da análise além dos eixos.
  //
  // Ele já dizia `final_result: "failed"`, mas deixava o status global no default (`running`): o
  // progresso afirmava que o resultado final falhou enquanto o status afirmava execução em curso.
  // A superfície terminal (AN-04) ficava inalcançável por qualquer scenario do catálogo.
  //
  // A correção é de COERÊNCIA do mock com o que ele mesmo declara — não de produto. Os scenarios
  // 13 e 14 continuam `running` de propósito: um componente falho com `final_result: pending` não
  // autoriza terminalizar a análise inteira, e forçá-los a `failed` só para caírem em AN-04 seria
  // inventar terminalidade que nenhuma autoridade publica.
  {
    id: "both-failed",
    superficies: ["AN-04"],
    estado: "disponivel",
    handlers: (b) => [
      progresso(b, { engine: "failed", analytics: "failed", export: "unavailable", final_result: "failed" }),
      status1(b, "failed"),
    ],
  },
  { id: "final-ready", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json(RESULT_VIEW))] },
  { id: "export-preparing", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "ready", export: "preparing", final_result: "ready" })] },
  { id: "export-ready", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "ready", export: "ready", final_result: "ready" })] },
  {
    id: "export-expired",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `expired` ≠ purged no DOMÍNIO — campos e eventos diferentes. Publicamente são a MESMA
    // condição: o produtor colapsa quatro causas (inexistente, de outro workspace, expirado e
    // purgado) num único `forbidden_or_not_found`/`404`, para a rota não virar oráculo de
    // existência. É decisão da MF5.2, e a mutação `g4-detalhe-distingue-as-negativas` mata quem
    // tentar distinguir uma das quatro no `detail`.
    //
    // O contrato NÃO publica um `export_expired` — inventei esse código na primeira versão e o
    // typecheck reprovou. O que veio no lugar, `410 result_not_available`, também não era o
    // produtor: o Gateway nunca emite `410`, e o corpo de `result_not_available` já declara
    // `status: 404` — o mock contradizia a si mesmo antes de contradizer o backend. Conferido
    // contra `api/routes/analyses_v1.py:739` e `infra/analyses_public.py:111`.
    handlers: (b) => [
      erro(b, "/v1/analyses/:id/analytics/export/download", 404, "forbidden_or_not_found"),
    ],
  },
  {
    id: "comparison-compatible",
    superficies: ["EVO-02"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json(RESULT_VIEW))],
  },
  {
    id: "comparison-schema-break",
    superficies: ["EVO-02"],
    estado: "disponivel",
    // DESCONTINUIDADE, não delta: registries diferentes não são comparáveis, e um número de
    // variação aqui seria uma resposta correta para a pergunta errada.
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, () =>
        json({ ...RESULT_VIEW, indicator_registry_version: "indicator-registry-2.0" })),
    ],
  },
  {
    id: "recommendation-persisted",
    superficies: ["RES-01", "EVO-02"],
    estado: "bloqueado",
    razao:
      "`recommendation_id` NÃO chega ao documento de resultado. Sem identidade durável não há " +
      "recomendação longitudinal — inventar um id faria o front prometer um acompanhamento que " +
      "o backend não sustenta no próximo run. É o BD03.",
  },
  {
    id: "privacy-omission",
    superficies: ["RES-01"],
    estado: "disponivel",
    handlers: (b) => [analytics(b, { component_status: "withheld", snapshot: null, withheld: { reason_code: "min_group_size", min_group_size: 5 } })],
  },
  {
    id: "no-baseline",
    superficies: ["INST-05"],
    estado: "bloqueado",
    razao: "Baseline NÃO existe no contrato público. Nenhuma operação a cria, lê ou compara.",
  },
  {
    id: "baseline-active",
    superficies: ["INST-05"],
    estado: "bloqueado",
    razao:
      "Depende de baseline, que não existe. O cenário exigiria ainda que uma baseline ativa " +
      "BLOQUEASSE exclusão — regra de ciclo de vida que nenhum contrato publica.",
  },
  { id: "session-expired", superficies: ["AUTH-04"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 401, "authentication_required")] },
  { id: "forbidden", superficies: ["ERR-403/404"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 404, "forbidden_or_not_found")] },
  {
    id: "not-found",
    superficies: ["ERR-403/404"],
    estado: "disponivel",
    // MESMA tela que `forbidden`, por contrato: distinguir as duas vazaria a existência do
    // recurso para quem não pode vê-lo.
    handlers: (b) => [erro(b, "/v1/analyses/:id", 404, "forbidden_or_not_found")],
  },
  { id: "capacity-wait", superficies: ["AN-03", "ERR-503"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 503, "capacity_wait")] },
  {
    id: "result-v1-legacy",
    superficies: ["RES-01"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json({ ...RESULT_VIEW, result_schema_version: "analysis-result-v1" }))],
  },
  { id: "idempotency-conflict", superficies: ["AN-01"], estado: "disponivel", handlers: (b) => [http.post(`${b}/v1/analyses`, () => json(problem("idempotency_conflict"), 409))] },
  {
    id: "list-pagination",
    superficies: ["EVO-01", "HOME-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/analyses`, ({ request }) =>
        json(new URL(request.url).searchParams.get("cursor") ? LIST_PAGE_2 : LIST_PAGE_1)),
    ],
  },
] as const;
