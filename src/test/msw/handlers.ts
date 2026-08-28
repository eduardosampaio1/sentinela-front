// Handlers MSW derivados das fixtures do contrato `public-v1` (Onda 6 E2/E3).
//
// SÓ campos públicos — nenhum conceito interno. Base absoluta `MSW_BASE` para os testes/dev
// controlado criarem o cliente canônico REAL (sem fetch injetado) e provarem o wiring de ponta a
// ponta. Testes específicos sobrescrevem via `server.use(...)`; a máquina de estados da jornada
// (progressão preparing→…→completed) é montada por `createAnalysisJourney` em `journey.ts`.

import { http, HttpResponse } from "msw";
import {
  HANDLE,
  LIST_PAGE_1,
  RESULT_VIEW,
  statusView,
  STATUS_VIEWS,
} from "@/test/fixtures/public-v1/analyses";

/** Base canônica usada nos testes/dev MSW (o cliente é criado com esta baseUrl). */
export const MSW_BASE = "http://gw.test";

const json = (body: unknown, status = 200) =>
  HttpResponse.json(body as Record<string, unknown>, { status });

/** Handlers default (happy path estático). A jornada stateful vem de `journey.ts`. */
export const handlers = [
  http.post(`${MSW_BASE}/v1/analyses`, () => json(HANDLE, 201)),
  http.post(`${MSW_BASE}/v1/analyses/:id/data`, () => json(statusView("receiving"))),
  http.post(`${MSW_BASE}/v1/analyses/:id/submit`, () => json({ ...HANDLE, status: "queued" })),
  http.post(`${MSW_BASE}/v1/analyses/:id/reprocess`, () => json({ ...HANDLE, status: "queued" })),
  http.get(`${MSW_BASE}/v1/analyses/:id/result`, () => json(RESULT_VIEW)),
  http.get(`${MSW_BASE}/v1/analyses/:id`, () => json(STATUS_VIEWS.running)),
  http.get(`${MSW_BASE}/v1/analyses`, () => json(LIST_PAGE_1)),
];
