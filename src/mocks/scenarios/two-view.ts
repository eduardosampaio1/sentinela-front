// M45.4 · ARG-01 / ANL-01 — os cenários das duas visões.
//
// ## Por que existem
//
// Elas eram as únicas superfícies REAL do Blueprint sem nome invocável — e não sem cobertura: a F6
// entregou as duas com a massa montada dentro da própria spec, o que provou a experiência e deixou
// o catálogo vazio. Nomear é o que permite que outra superfície, um Storybook ou uma missão futura
// peçam o mesmo estado sem remontá-lo, e é o invariante do gate 2 da M45.
//
// ## Por que em arquivo próprio
//
// Mesma catraca da M44: com as três entradas dentro dele, o `catalogo.ts` passou de 1000 linhas
// (M07 · anti-monólito). O catálogo continua sendo o índice único — é ele que garante id sem
// duplicata e é por ele que todo mundo pede.

import { http } from "msw";
import { HttpResponse } from "msw";
import { RESULT_VIEW, problem } from "@/test/fixtures/public-v1/analyses";
import { V3_COMPARACAO, analytics, envelopeV3 } from "./documentos";
import type { Scenario } from "./catalogo";

const json = (b: unknown, s = 200) => HttpResponse.json(b as Record<string, unknown>, { status: s });

export const CENARIOS_DA_DUPLA_VISAO: readonly Scenario[] = [
  {
    id: "argos-document-present",
    superficies: ["ARG-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, ({ params, request }) => {
        // SEM a query, devolve o histórico. É o que a rota real faz, e é o que impede este
        // scenario de ensinar a tela a receber v3 sem ter pedido.
        const pedida = new URL(request.url).searchParams.get("result_schema_version");
        if (!pedida) return json(RESULT_VIEW);
        return json(envelopeV3(String(params.id), V3_COMPARACAO.A));
      }),
    ],
  },

  // A análise ANTIGA. O produtor recusa a versão pedida, e a recusa é o estado — nunca um
  // fallback silencioso para o v1: dez famílias ausentes seriam lidas como "o ARGOS não achou
  // nada", e nada na tela denunciaria.
  {
    id: "argos-document-absent",
    superficies: ["ARG-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, ({ request }) => {
        const pedida = new URL(request.url).searchParams.get("result_schema_version");
        if (!pedida) return json(RESULT_VIEW);
        return json(problem("result_not_available"), 404);
      }),
    ],
  },

  // A visão Analytics. Ela NÃO serve `/result` — e a ausência é a prova: um scenario que servisse
  // as duas rotas deixaria passar uma tela que lê o documento errado.
  {
    id: "analytics-view-present",
    superficies: ["ANL-01"],
    estado: "disponivel",
    handlers: (b) => [
      analytics(b, { component_status: "ready", snapshot: { blocos: [] }, withheld: null }),
    ],
  },
] as const;
