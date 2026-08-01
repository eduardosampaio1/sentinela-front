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

/** Semeia uma análise já num estado/roteiro (p/ testes de deep-link/retry direto). */
export function seedJourney(analysisId: string, seq: AnalysisStatus[], retryAllowed = false): void {
  putEntry(analysisId, { seq, idx: 0, retryAllowed });
}

function corrente(id: string): { status: AnalysisStatus; retryAllowed: boolean } {
  const e = getEntry(id);
  if (!e) return { status: "running", retryAllowed: false };
  const status = e.seq[Math.min(e.idx, e.seq.length - 1)];
  if (e.idx < e.seq.length - 1) {
    putEntry(id, { ...e, idx: e.idx + 1 }); // avança a cada poll até o terminal
  }
  return { status, retryAllowed: e.retryAllowed };
}

/** Roteiro pós-submit padrão: fila → execução → recuperação → execução → concluída. */
const ROTEIRO_PADRAO: AnalysisStatus[] = ["queued", "running", "recovering", "running", "completed"];

const view = (id: string, status: AnalysisStatus, retryAllowed = false) =>
  statusView(status, {
    analysis_id: id,
    result_available: status === "completed",
    retry_allowed: retryAllowed, // controlado pela semente (permite failed NÃO recuperável)
  });

/**
 * Handlers da sequência ligados a uma `base`. O node/vitest usa `MSW_BASE` (`journeyHandlers`);
 * o browser worker usa `window.location.origin` (mesma origem → sem CORS no cross-origin do SW).
 */
export function makeJourneyHandlers(base: string) {
  const b = base.replace(/\/+$/, "");
  return [
    http.post(`${b}/v1/analyses`, () => {
      const id = "an-e2e";
      putEntry(id, { seq: ["preparing"], idx: 0, retryAllowed: false });
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
    http.get(`${b}/v1/analyses/:id/result`, ({ params }) => {
      const id = String(params.id);
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
    http.get(`${b}/v1/analyses`, ({ request }) => {
      const u = new URL(request.url);
      const ws = u.searchParams.get("workspace_id") ?? "";
      const cursor = u.searchParams.get("cursor");
      return HttpResponse.json(getList(ws, cursor));
    }),
    http.get(`${b}/v1/analyses/:id`, ({ params }) => {
      const id = String(params.id);
      const err = getStatusError(id);
      if (err) {
        return HttpResponse.json(
          { type: `urn:sentinela:error:${err.code}`, title: err.code, status: err.http, code: err.code, detail: err.code },
          { status: err.http, headers: { "content-type": "application/problem+json" } },
        );
      }
      const { status, retryAllowed } = corrente(id);
      return HttpResponse.json(view(id, status, retryAllowed));
    }),
  ];
}

export const journeyHandlers = makeJourneyHandlers(MSW_BASE);
