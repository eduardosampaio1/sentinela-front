// Sequência STATEFUL do contrato público para a jornada (Onda 6 E3 reconciliação, item 5).
//
// Determinada pela OPERAÇÃO/analysis_id — nunca por contador global frágil. Um store por
// analysis_id avança os estados a cada GET (poll). Dois backends:
//   • memória (default): usado no node/vitest; `resetJourney()` isola entre testes.
//   • sessionStorage: ativado por `useSessionJourneyStore()` no browser worker — sobrevive ao
//     reload (cenário "refresh": reconstruir por analysis_id) e o Playwright limpa entre specs.

import { http, HttpResponse } from "msw";
import type { AnalysisStatus } from "@/lib/v1";
import { RESULT_VIEW, statusView } from "@/test/fixtures/public-v1/analyses";
import { MSW_BASE } from "./handlers";

interface JourneyEntry {
  seq: AnalysisStatus[]; // roteiro a partir do submit
  idx: number;
  retryAllowed: boolean;
}

let backend: "memory" | "session" = "memory";
const mem = new Map<string, JourneyEntry>();
const SESSION_KEY = "__sentinela_journey__";

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
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
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
    retry_allowed: retryAllowed || status === "failed",
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
    http.get(`${b}/v1/analyses/:id/result`, ({ params }) =>
      HttpResponse.json({ ...RESULT_VIEW, analysis_id: String(params.id) }),
    ),
    http.get(`${b}/v1/analyses/:id`, ({ params }) => {
      const id = String(params.id);
      const { status, retryAllowed } = corrente(id);
      return HttpResponse.json(view(id, status, retryAllowed));
    }),
  ];
}

export const journeyHandlers = makeJourneyHandlers(MSW_BASE);
