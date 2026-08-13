// Sequência STATEFUL do contrato público para a jornada (Onda 6 E3 reconciliação, item 5).
//
// Determinada pela OPERAÇÃO/analysis_id — nunca por contador global frágil. Um store por
// analysis_id avança os estados a cada GET (poll). Dois backends:
//   • memória (default): usado no node/vitest; `resetJourney()` isola entre testes.
//   • sessionStorage: ativado por `useSessionJourneyStore()` no browser worker — sobrevive ao
//     reload (cenário "refresh": reconstruir por analysis_id) e o Playwright limpa entre specs.

import { http, HttpResponse } from "msw";
import type { AnalysisListPage, AnalysisStatus } from "@/lib/v1";
import { RESULT_VIEW, statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "./handlers";

interface JourneyEntry {
  seq: AnalysisStatus[]; // roteiro a partir do submit
  idx: number;
  retryAllowed: boolean;
  /** M37: a Instância que originou a análise. `null` = análise solta, o caso da jornada geral. */
  instanceId?: string | null;
}

let backend: "memory" | "session" = "memory";
const mem = new Map<string, JourneyEntry>();
const listMem = new Map<string, AnalysisListPage>();
const SESSION_KEY = "__sentinela_journey__";
const LIST_SESSION_KEY = "__sentinela_list__";

/** Troca o backend para sessionStorage (browser E2E: persiste através do reload). */
export function enableSessionJourneyStore(): void {
  backend = "session";
}

function readAll(): Record<string, JourneyEntry> {
  if (backend === "memory" || typeof sessionStorage === "undefined") {
    return Object.fromEntries(mem);
  }
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}") as Record<string, JourneyEntry>;
  } catch {
    return {};
  }
}

function getEntry(id: string): JourneyEntry | undefined {
  if (backend === "memory") return mem.get(id);
  return readAll()[id];
}

function putEntry(id: string, entry: JourneyEntry): void {
  if (backend === "memory") {
    mem.set(id, entry);
    return;
  }
  const all = readAll();
  all[id] = entry;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

export function resetJourney(): void {
  mem.clear();
  listMem.clear();
  errMem.clear();
  resMem.clear();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LIST_SESSION_KEY);
    sessionStorage.removeItem(ERR_SESSION_KEY);
    sessionStorage.removeItem(RES_SESSION_KEY);
  }
}

// ── LISTAGEM (E4): páginas por (workspace, cursor). Chave = `${workspaceId}|${cursor ?? ""}`. ──
function readListAll(): Record<string, AnalysisListPage> {
  if (backend === "memory" || typeof sessionStorage === "undefined") return Object.fromEntries(listMem);
  try {
    return JSON.parse(sessionStorage.getItem(LIST_SESSION_KEY) ?? "{}") as Record<string, AnalysisListPage>;
  } catch {
    return {};
  }
}

function listKey(workspaceId: string, cursor: string | null): string {
  return `${workspaceId}|${cursor ?? ""}`;
}

/** Semeia uma PÁGINA de listagem para (workspace, cursor). */
export function seedList(workspaceId: string, cursor: string | null, pageData: AnalysisListPage): void {
  const key = listKey(workspaceId, cursor);
  if (backend === "memory") {
    listMem.set(key, pageData);
    return;
  }
  const all = readListAll();
  all[key] = pageData;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(LIST_SESSION_KEY, JSON.stringify(all));
}

function getList(workspaceId: string, cursor: string | null): AnalysisListPage {
  const found = backend === "memory" ? listMem.get(listKey(workspaceId, cursor)) : readListAll()[listKey(workspaceId, cursor)];
  return found ?? { items: [], next_cursor: null };
}

// ── ERRO de status por analysis_id (E6): GET /{id} devolve um problem+json semeado (ex.: 401). ──
const errMem = new Map<string, { http: number; code: string }>();
const ERR_SESSION_KEY = "__sentinela_status_error__";
/** M38 — seams da LISTAGEM, mesma convenção do erro de status acima. O `page.route` do Playwright
 *  não serve: o MSW é service worker e intercepta antes dele. Erro e atraso precisam nascer aqui. */
const LIST_ERR_KEY = "__sentinela_list_error__";
const LIST_DELAY_KEY = "__sentinela_list_delay__";

export function seedStatusError(analysisId: string, httpStatus: number, code: string): void {
  if (backend === "memory") {
    errMem.set(analysisId, { http: httpStatus, code });
    return;
  }
  const all = readErrAll();
  all[analysisId] = { http: httpStatus, code };
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ERR_SESSION_KEY, JSON.stringify(all));
}

function readErrAll(): Record<string, { http: number; code: string }> {
  if (backend === "memory" || typeof sessionStorage === "undefined") return Object.fromEntries(errMem);
  try {
    return JSON.parse(sessionStorage.getItem(ERR_SESSION_KEY) ?? "{}") as Record<string, { http: number; code: string }>;
  } catch {
    return {};
  }
}

function getStatusError(analysisId: string): { http: number; code: string } | undefined {
  return backend === "memory" ? errMem.get(analysisId) : readErrAll()[analysisId];
}

// ── PAYLOAD do resultado por analysis_id (E5). Semeado pelos testes; `result` fica opaco no
//    contrato e é o validator/adapter do frontend que decide se é suportado. ──
const resMem = new Map<string, unknown>();
const RES_SESSION_KEY = "__sentinela_result__";

function readResAll(): Record<string, unknown> {
  if (backend === "memory" || typeof sessionStorage === "undefined") return Object.fromEntries(resMem);
  try {
    return JSON.parse(sessionStorage.getItem(RES_SESSION_KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function seedResult(analysisId: string, payload: unknown): void {
  if (backend === "memory") {
    resMem.set(analysisId, payload);
    return;
  }
  const all = readResAll();
  all[analysisId] = payload;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(RES_SESSION_KEY, JSON.stringify(all));
}

function getResult(analysisId: string): unknown {
  const achado = backend === "memory" ? resMem.get(analysisId) : readResAll()[analysisId];
  return achado ?? RESULT_VIEW.result;
}

// ── documento ARGOS (`analysis-result-v3`) — CASA PRÓPRIA ────────────────────────────────
//
// Separado do histórico de propósito, espelhando o produtor: são dois documentos servidos pela
// MESMA rota, distinguidos só pela query. Um mapa compartilhado faria o v3 responder a quem não
// pediu — que é exatamente a queda silenciosa que o contrato proíbe.
const v3Mem = new Map<string, unknown>();
const V3_SESSION_KEY = "__sentinela_result_v3__";

function readV3All(): Record<string, unknown> {
  if (backend === "memory" || typeof sessionStorage === "undefined") return Object.fromEntries(v3Mem);
  try {
    return JSON.parse(sessionStorage.getItem(V3_SESSION_KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function seedResultV3(analysisId: string, documento: unknown): void {
  if (backend === "memory") {
    v3Mem.set(analysisId, documento);
    return;
  }
  const all = readV3All();
  all[analysisId] = documento;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(V3_SESSION_KEY, JSON.stringify(all));
}

/** `undefined` = esta análise NÃO tem v3. Não é `{}`, não é o v1: é ausência. */
function getResultV3(analysisId: string): unknown {
  return backend === "memory" ? v3Mem.get(analysisId) : readV3All()[analysisId];
}

/** O vocabulário que o Orchestrator aceita. Fechado, como lá. */
const VERSOES_V3 = new Set(["3", "v3", "analysis-result-v3"]);

// ── projeção do ANALYTICS — casa própria, outro motor ───────────────────────────────────
//
// O endpoint `/analytics` nunca fora mockado: a região analítica ao vivo existia desde a M27 e
// só era exercitada em teste de unidade. Em browser, ela sempre caía no `forbidden_or_not_found`
// do handler genérico — e ninguém notava, porque nenhuma tela dependia dela para renderizar.
// A visão Analytics depende, e foi ela que revelou o buraco.
const anlMem = new Map<string, unknown>();
const ANL_SESSION_KEY = "__sentinela_analytics__";

function readAnlAll(): Record<string, unknown> {
  if (backend === "memory" || typeof sessionStorage === "undefined") return Object.fromEntries(anlMem);
  try {
    return JSON.parse(sessionStorage.getItem(ANL_SESSION_KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function seedAnalytics(analysisId: string, vista: unknown): void {
  if (backend === "memory") {
    anlMem.set(analysisId, vista);
    return;
  }
  const all = readAnlAll();
  all[analysisId] = vista;
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ANL_SESSION_KEY, JSON.stringify(all));
}

function getAnalytics(analysisId: string): unknown {
  return backend === "memory" ? anlMem.get(analysisId) : readAnlAll()[analysisId];
}

/** `problem+json` como o Gateway responde — e não um 500 cru, que faria a tela exercitar um
 * caminho que produção nunca produz. */
function problema(code: string, status: number, detail: string) {
  return { type: `urn:sentinela:error:${code}`, title: code, status, code, detail };
}

/** Semeia uma análise já num estado/roteiro (p/ testes de deep-link/retry direto). */
export function seedJourney(analysisId: string, seq: AnalysisStatus[], retryAllowed = false): void {
  putEntry(analysisId, { seq, idx: 0, retryAllowed });
}

function corrente(id: string): { status: AnalysisStatus; retryAllowed: boolean; instanceId: string | null } {
  const e = getEntry(id);
  if (!e) return { status: "running", retryAllowed: false, instanceId: null };
  const status = e.seq[Math.min(e.idx, e.seq.length - 1)];
  if (e.idx < e.seq.length - 1) {
    putEntry(id, { ...e, idx: e.idx + 1 }); // avança a cada poll até o terminal
  }
  return { status, retryAllowed: e.retryAllowed, instanceId: e.instanceId ?? null };
}

/** Roteiro pós-submit padrão: fila → execução → recuperação → execução → concluída. */
const ROTEIRO_PADRAO: AnalysisStatus[] = ["queued", "running", "recovering", "running", "completed"];

const view = (id: string, status: AnalysisStatus, retryAllowed = false, instanceId: string | null = null) =>
  statusView(status, {
    analysis_id: id,
    result_available: status === "completed",
    retry_allowed: retryAllowed, // controlado pela semente (permite failed NÃO recuperável)
    // M37: a associação só aparece AQUI — nunca na resposta do prepare.
    instance_id: instanceId,
  });

/**
 * Handlers da sequência ligados a uma `base`. O node/vitest usa `MSW_BASE` (`journeyHandlers`);
 * o browser worker usa `window.location.origin` (mesma origem → sem CORS no cross-origin do SW).
 */
/** A Instância da jornada E2E. Mesma massa dos scenarios oficiais, para a prova visual e a
 *  automatizada olharem o mesmo produto. */
const INSTANCIA_E2E = {
  instance_id: "inst-e2e-0000-4000-8000-000000000001",
  name: "Produção",
  created_at: "2026-07-20T09:00:00Z",
} as const;

const analiseE2E = (analysis_id: string, over: Record<string, unknown> = {}) => ({
  analysis_id,
  status: "completed",
  record_count: 1240,
  result_available: true,
  created_at: "2026-07-30T10:00:00Z",
  instance_id: INSTANCIA_E2E.instance_id,
  ...over,
});

// A ordem é DELIBERADAMENTE contrária a qualquer sort local por id: o backend ordena por
// `(created_at desc, analysis_id desc)`, e uma massa já crescente faria um `sort()` no browser
// passar despercebido — foi o que um mutante sobrevivente mostrou.
const HISTORICO_E2E_PAGINA_1 = {
  items: [
    analiseE2E("an-inst-0002", { status: "failed", result_available: false, record_count: 300 }),
    analiseE2E("an-inst-0001"),
  ],
  next_cursor: "cursor-inst-2",
};

const HISTORICO_E2E_PAGINA_2 = {
  items: [analiseE2E("an-inst-0003", { status: "running", result_available: false, record_count: null })],
  next_cursor: null,
};

/** Chave que pede a lista de Instâncias VAZIA — o estado de workspace autorizado sem nenhuma. */
export const CHAVE_INSTANCIAS_VAZIAS = "sentinela:e2e:instancias-vazias";

function vazioPedido(): boolean {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem(CHAVE_INSTANCIAS_VAZIAS) === "1";
  } catch {
    return false;
  }
}

export function makeJourneyHandlers(base: string) {
  const b = base.replace(/\/+$/, "");
  return [
    http.post(`${b}/v1/analyses`, ({ request }) => {
      const id = "an-e2e";
      // M37 · INST-04: o journey espelha o produtor e o scenario oficial — a associação chega
      // pela QUERY, é GUARDADA no write e só se torna legível no status. Ausência continua
      // válida: o campo é opcional, e um 4xx aqui mentiria sobre o contrato.
      const instancia = new URL(request.url).searchParams.get("instance_id");
      putEntry(id, { seq: ["preparing"], idx: 0, retryAllowed: false, instanceId: instancia });
      return HttpResponse.json({ analysis_id: id, status: "preparing" }, { status: 201 });
    }),
    http.post(`${b}/v1/analyses/:id/data`, ({ params }) => {
      const id = String(params.id);
      putEntry(id, { seq: ["receiving"], idx: 0, retryAllowed: false });
      return HttpResponse.json(view(id, "receiving"));
    }),
    http.post(`${b}/v1/analyses/:id/submit`, ({ params }) => {
      const id = String(params.id);
      putEntry(id, { seq: ROTEIRO_PADRAO, idx: 0, retryAllowed: false });
      return HttpResponse.json({ analysis_id: id, status: "queued" });
    }),
    http.post(`${b}/v1/analyses/:id/retry`, ({ params }) => {
      const id = String(params.id);
      putEntry(id, { seq: ["recovering", "running", "completed"], idx: 0, retryAllowed: false });
      return HttpResponse.json({ analysis_id: id, status: "recovering" });
    }),
    http.get(`${b}/v1/analyses/:id/analytics`, ({ params }) => {
      const id = String(params.id);
      const vista = getAnalytics(id);
      if (vista === undefined) {
        // Ausência da PROJEÇÃO, não da análise. `pending` é o que o produtor diz quando o
        // componente ainda não entregou — e é diferente de "esta análise não existe".
        return HttpResponse.json({
          analysis_id: id,
          component_status: "pending",
          snapshot_contract_version: null,
          snapshot_digest: null,
          snapshot: null,
          disclosure_rule_version: null,
          projection_digest: null,
          withheld: null,
          generated_at: null,
        });
      }
      return HttpResponse.json(vista);
    }),
    http.get(`${b}/v1/analyses/:id/result`, ({ params, request }) => {
      const id = String(params.id);

      // ── negociação de versão, igual à do produtor ──────────────────────────────────────
      //
      // Sem o parâmetro, a resposta é a de sempre — byte a byte. Com ele, o v3 ou um problema
      // EXPLÍCITO: nunca o documento histórico com cara de ARGOS, que faria dez famílias
      // ausentes parecerem "o ARGOS não produziu nada".
      const pedida = new URL(request.url).searchParams.get("result_schema_version") ?? "";
      if (pedida) {
        if (!VERSOES_V3.has(pedida)) {
          return HttpResponse.json(
            problema("invalid_input", 400, `versao desconhecida: ${pedida}`),
            { status: 400, headers: { "content-type": "application/problem+json" } },
          );
        }
        const doc = getResultV3(id);
        if (doc === undefined) {
          return HttpResponse.json(
            problema("result_not_available", 404, "esta analise nao tem analysis-result-v3"),
            { status: 404, headers: { "content-type": "application/problem+json" } },
          );
        }
        return HttpResponse.json({
          ...RESULT_VIEW,
          analysis_id: id,
          result_schema_version: "analysis-result-v3",
          result: doc,
        });
      }

      const payload = getResult(id);
      // O fake backend DECLARA no envelope a versão do que produziu — é o discriminador contratado.
      // Antes o envelope dizia sempre "analysis-result-v1" enquanto servia outra forma; a fronteira
      // só não reprovava porque olhava dentro do blob (Codex E5/E7 R3 [P2]).
      const versao =
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { schema?: unknown }).schema === "string"
          ? (payload as { schema: string }).schema
          : RESULT_VIEW.result_schema_version;
      return HttpResponse.json({
        ...RESULT_VIEW,
        analysis_id: id,
        result_schema_version: versao,
        result: payload,
      });
    }),
    http.get(`${b}/v1/analyses`, async ({ request }) => {
      // Atraso opcional: é o único jeito de o `loading` da lista ficar observável em browser.
      if (typeof sessionStorage !== "undefined") {
        const espera = Number(sessionStorage.getItem(LIST_DELAY_KEY) ?? 0);
        if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      }
      const u = new URL(request.url);
      const ws = u.searchParams.get("workspace_id") ?? "";
      const cursor = u.searchParams.get("cursor");
      // BD02/M36 — o histórico DA Instância é esta mesma operação, filtrada. O handler EXIGE o
      // filtro para responder o histórico: sem `instance_id` ele devolve a listagem geral, e é
      // essa diferença que faz a tela falhar caso deixe de enviá-lo.
      const instancia = u.searchParams.get("instance_id");
      if (instancia) {
        return HttpResponse.json(
          instancia === INSTANCIA_E2E.instance_id
            ? cursor
              ? HISTORICO_E2E_PAGINA_2
              : HISTORICO_E2E_PAGINA_1
            : { items: [], next_cursor: null },
        );
      }
      // Erro da LISTAGEM (M38 · EVO-01). `problem+json`, como o Gateway responde — e não um 500
      // cru, que faria a tela exercitar um caminho que produção nunca produz.
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(LIST_ERR_KEY)) {
        return HttpResponse.json(
          { type: "about:blank", title: "temporarily_unavailable", status: 503, code: "temporarily_unavailable" },
          { status: 503, headers: { "content-type": "application/problem+json" } },
        );
      }
      return HttpResponse.json(getList(ws, cursor));
    }),
    // M36 — as Instâncias. Três campos e nada mais: é o que o contrato publica, e é a razão de
    // INST-02 (Estado) não existir nesta jornada.
    http.get(`${b}/v1/instances`, () =>
      // O vazio é pedido por `sessionStorage`, no MESMO mecanismo que a jornada já usa para o
      // resto do estado. `page.route` do Playwright não serve aqui: o MSW é service worker e
      // intercepta antes — o teste "passaria" mostrando a lista populada.
      HttpResponse.json(
        vazioPedido() ? { items: [], next_cursor: null } : { items: [INSTANCIA_E2E], next_cursor: null },
      ),
    ),
    http.get(`${b}/v1/instances/:id`, ({ params }) =>
      String(params.id) === INSTANCIA_E2E.instance_id
        ? HttpResponse.json(INSTANCIA_E2E)
        : HttpResponse.json(
            {
              type: "urn:sentinela:error:forbidden_or_not_found",
              title: "Nao encontrado",
              status: 404,
              code: "forbidden_or_not_found",
              detail: "forbidden_or_not_found",
              instance: "",
              retryable: false,
            },
            { status: 404 },
          ),
    ),
    http.get(`${b}/v1/analyses/:id`, ({ params }) => {
      const id = String(params.id);
      const err = getStatusError(id);
      if (err) {
        return HttpResponse.json(
          { type: `urn:sentinela:error:${err.code}`, title: err.code, status: err.http, code: err.code, detail: err.code },
          { status: err.http, headers: { "content-type": "application/problem+json" } },
        );
      }
      const { status, retryAllowed, instanceId } = corrente(id);
      return HttpResponse.json(view(id, status, retryAllowed, instanceId));
    }),
  ];
}

export const journeyHandlers = makeJourneyHandlers(MSW_BASE);
