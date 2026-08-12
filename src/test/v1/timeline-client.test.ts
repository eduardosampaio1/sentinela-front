// M23 — o cliente de `/timeline`, contra o servidor de verdade (MSW), contra o contrato público
// e contra `public-events-v1`, que é quem declara os eventos.
//
// ## A linha do tempo é LIDA, nunca remontada
//
// Ela vem dos eventos duráveis gravados na transação autoritativa. Remontá-la a partir do estado
// atual produziria uma história plausível em vez da que aconteceu — e as duas divergem
// exatamente no caso interessante: a análise que foi e voltou. Por isso este cliente não ordena,
// não agrupa, não deduplica, não preenche lacuna e não deriva evento nenhum.
//
// ## Sem percentual
//
// Não existe fonte confiável para "37%", e inventar o número é a forma mais rápida de o cliente
// perder a confiança no resto da tela. O contrato diz isso em `timeline_nota`, o produtor repete
// no docstring da rota, e aqui vira gate.
//
// ## Dois eventos que não podem colapsar
//
// `analysis.completed` e `result.available` mapeiam ambos para o estado público `completed` e
// significam coisas diferentes: um diz que a execução terminou, o outro que existe documento
// publicável. Juntá-los apagaria a janela em que a análise acabou e o resultado ainda não estava
// lá — que é justamente quando alguém pergunta o que houve.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createV1Client, ProblemError } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { resolverOrigemDoContrato } from "./contractOrigin";
import { SEM_CLIENTE_NO_FRONT } from "./divergenciaDeclarada";
import {
  compararOperacoes,
  operacoesDoCliente,
  operacoesDoContrato,
  tiposDeclarados,
} from "./operationInventory";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const ESCOPO = { workspaceId: "ws-1" };
const cliente = () => createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
const CAMINHO = "/v1/analyses/:id/timeline";

const origem = resolverOrigemDoContrato();
const contrato = JSON.parse(
  readFileSync(resolve(origem.escolhida!.caminho, "public-v1.json"), "utf-8"),
) as Record<string, unknown>;

const FONTE_TIPOS = readFileSync(resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts"), "utf-8");
const FONTE_CLIENTE = readFileSync(resolve(RAIZ, "src/lib/v1/client.ts"), "utf-8");
const FONTE_DADOS = readFileSync(
  resolve(RAIZ, "src/features/canonical-analysis/data/analysis.ts"),
  "utf-8",
);

/**
 * O contrato dos EVENTOS, publicado pelo Orchestrator. Mesmo desenho da BD08: quem sabe qual
 * checkout manda diz o caminho. O default é a árvore do Orchestrator congelada no manifesto do
 * freeze (`integracao/item16-main-develop`).
 *
 * Existem três cópias no disco (`orchestrator-eventos`, `sentinela-orchestrator` e
 * `sentinela-event-dispatcher`). Elas concordam byte a byte no que importa aqui — `eventos`,
 * `envelope` e `nunca_publicos` — e divergem só na prosa de `ordering`, porque o Dispatcher
 * descreve ENTREGA (at-least-once, fora de ordem) e o Orchestrator descreve LEITURA. A timeline
 * é leitura.
 */
const CONTRATO_EVENTOS = process.env.SENTINELA_EVENTS_CONTRATO
  ? resolve(process.env.SENTINELA_EVENTS_CONTRATO)
  : resolve(RAIZ, "../sentinela-orchestrator/src/orchestrator/public_events/public-events-v1.json");
const eventosDisponivel = existsSync(CONTRATO_EVENTOS);

interface ContratoDeEventos {
  version: string;
  envelope: string[];
  eventos: Record<string, { data_keys: string[]; data_enums?: Record<string, string[]> }>;
  nunca_publicos: string[];
}
const lerEventos = (): ContratoDeEventos =>
  JSON.parse(readFileSync(CONTRATO_EVENTOS, "utf-8")) as ContratoDeEventos;

/** Os `event_type` que a união do front declara, lidos do FONTE — não redigitados. */
function tiposNoFront(): string[] {
  const bloco = FONTE_TIPOS.slice(
    FONTE_TIPOS.indexOf("export type TimelineEventType ="),
    FONTE_TIPOS.indexOf("/** `data.reason` de `analysis.recovering`"),
  );
  return [...bloco.matchAll(/"([a-z_]+\.[a-z_]+)"/g)].map((m) => m[1]).sort();
}

/** Os `data_keys` que cada variante da união discriminada declara, lidos do FONTE. */
function dataKeysNoFront(): Record<string, string[]> {
  const bloco = FONTE_TIPOS.slice(FONTE_TIPOS.indexOf("export type TimelineEvent ="));
  const fim = bloco.indexOf("export interface AnalysisTimelineView");
  const uniao = bloco.slice(0, fim);
  const saida: Record<string, string[]> = {};
  for (const m of uniao.matchAll(
    /event_type:\s*"([^"]+)";\s*\n?\s*data:\s*(Record<string, never>|\{([^}]*)\})/g,
  )) {
    const [, tipo, bruto, corpo] = m;
    saida[tipo] =
      bruto === "Record<string, never>"
        ? []
        : [...(corpo ?? "").matchAll(/([a-z_]+)\s*:/g)].map((k) => k[1]).sort();
  }
  return saida;
}

const EVENTO_BASE = {
  event_id: "ev-1",
  event_schema_version: "public-events-v1",
  analysis_id: "an-abc",
  workspace_id: "ws-1",
  occurred_at: "2026-08-10T12:00:00Z",
};

/** Fora de ordem DE PROPÓSITO: o cliente não pode reordenar. */
const RESPOSTA = {
  analysis_id: "an-abc",
  events: [
    { ...EVENTO_BASE, event_id: "ev-3", event_type: "result.available", sequence: 3, data: {} },
    { ...EVENTO_BASE, event_id: "ev-1", event_type: "analysis.created", sequence: 1, data: {} },
    {
      ...EVENTO_BASE,
      event_id: "ev-2",
      event_type: "analysis.completed",
      sequence: 2,
      data: { result_available: true },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — as DUAS autoridades estão no disco
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 1. há o que julgar", () => {
  it("o contrato dos EVENTOS está no disco — ou alguém declarou que não está", () => {
    // Fail-closed, como o A1 e a BD08: sem o produtor, os casos abaixo não verificariam nada e
    // o arquivo passaria por vacuidade. Ausência precisa aparecer no comando.
    if (eventosDisponivel) return;
    expect(
      process.env.SENTINELA_EVENTS_ORIGIN_ABSENT === "1",
      `contrato de eventos não encontrado em ${CONTRATO_EVENTOS}. Para rodar assim de propósito, ` +
        "declare SENTINELA_EVENTS_ORIGIN_ABSENT=1.",
    ).toBe(true);
  });

  it("`get_analysis_timeline` está em `operations[]`, com método, path e query exatos", () => {
    const ops = contrato.operations as {
      operationId: string;
      method: string;
      path: string;
      required_query?: string[];
      success_status?: number[];
    }[];
    const op = ops.find((o) => o.operationId === "get_analysis_timeline");
    expect(op, "`get_analysis_timeline` sumiu do contrato").toBeTruthy();
    expect(op?.method).toBe("GET");
    expect(op?.path).toBe("/v1/analyses/{analysis_id}/timeline");
    expect(op?.required_query).toContain("workspace_id");
    expect(op?.success_status).toEqual([200]);
  });

  it("o contrato público aponta para `public-events-v1` e declara os 8 campos do envelope", () => {
    expect(contrato.timeline_event_schema).toBe("public-events-v1");
    expect(contrato.timeline_event_fields).toEqual([
      "event_id",
      "event_type",
      "event_schema_version",
      "analysis_id",
      "workspace_id",
      "sequence",
      "occurred_at",
      "data",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Método, caminho e escopo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 2. o cliente fala com o endereço contratado", () => {
  it("`GET /v1/analyses/{id}/timeline?workspace_id=…`", async () => {
    let visto: { metodo: string; caminho: string; ws: string | null } | null = null;
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, ({ request }) => {
        const url = new URL(request.url);
        visto = {
          metodo: request.method,
          caminho: url.pathname,
          ws: url.searchParams.get("workspace_id"),
        };
        return HttpResponse.json(RESPOSTA);
      }),
    );

    await cliente().getTimeline("an-abc", ESCOPO);

    expect(visto).not.toBeNull();
    expect(visto!.metodo).toBe("GET");
    expect(visto!.caminho).toBe("/v1/analyses/an-abc/timeline");
    expect(visto!.ws, "sem `workspace_id` a chamada sai sem escopo de tenant").toBe("ws-1");
  });

  it("workspace vazio falha ANTES da rede — fail-closed", async () => {
    let bateu = false;
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () => {
        bateu = true;
        return HttpResponse.json(RESPOSTA);
      }),
    );

    await expect(cliente().getTimeline("an-abc", { workspaceId: "" })).rejects.toBeInstanceOf(
      ProblemError,
    );
    expect(bateu, "a requisição saiu sem escopo de tenant").toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Os tipos de evento são os do CONTRATO — nem um a mais, nem um a menos
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 3. o vocabulário de eventos", () => {
  it.runIf(eventosDisponivel)("a união do front é EXATAMENTE `eventos` de public-events-v1", () => {
    const doContrato = Object.keys(lerEventos().eventos).sort();
    expect(doContrato.length, "âncora quebrada: contrato sem eventos").toBeGreaterThan(0);
    // Igualdade nas DUAS direções: um tipo inventado no front reprova, e um tipo novo do
    // produtor também — porque um evento que a tela não sabe nomear não pode chegar calado.
    expect(tiposNoFront()).toEqual(doContrato);
  });

  it.runIf(eventosDisponivel)("cada variante declara os `data_keys` do contrato", () => {
    const { eventos } = lerEventos();
    const noFront = dataKeysNoFront();
    expect(Object.keys(noFront).sort(), "âncora quebrada: união não parseada").toEqual(
      Object.keys(eventos).sort(),
    );
    for (const [tipo, def] of Object.entries(eventos)) {
      expect(noFront[tipo], `\`${tipo}\`: data_keys divergiram do contrato`).toEqual(
        [...def.data_keys].sort(),
      );
    }
  });

  it.runIf(eventosDisponivel)("os enums fechados do contrato estão no front, iguais", () => {
    const { eventos } = lerEventos();
    for (const [tipo, def] of Object.entries(eventos)) {
      for (const [chave, valores] of Object.entries(def.data_enums ?? {})) {
        for (const v of valores) {
          expect(FONTE_TIPOS, `\`${tipo}.data.${chave}\`: valor \`${v}\` ausente no front`).toContain(
            `"${v}"`,
          );
        }
      }
    }
  });

  it("`analysis.completed` e `result.available` NÃO colapsam", () => {
    const tipos = tiposNoFront();
    expect(tipos).toContain("analysis.completed");
    expect(tipos).toContain("result.available");
    // Os dois mapeiam para o estado público `completed`; se um sumisse, a janela entre
    // "terminou" e "há documento" deixaria de existir na tela.
    expect(new Set(tipos).size).toBe(tipos.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Lida, não remontada
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 4. o front não calcula a linha do tempo", () => {
  it("os eventos chegam na ORDEM do produtor — o cliente não reordena", async () => {
    server.use(http.get(`${MSW_BASE}${CAMINHO}`, () => HttpResponse.json(RESPOSTA)));

    const vista = await cliente().getTimeline("an-abc", ESCOPO);

    // A resposta vem 3,1,2 de propósito. Ordenar aqui seria o front opinando sobre a história.
    expect(vista.events.map((e) => e.sequence)).toEqual([3, 1, 2]);
    expect(vista).toEqual(RESPOSTA);
  });

  it("lista vazia continua vazia — ausência não vira evento sintético", async () => {
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json({ analysis_id: "an-abc", events: [] }),
      ),
    );

    const vista = await cliente().getTimeline("an-abc", ESCOPO);

    expect(vista.events).toEqual([]);
  });

  it("nada de percentual, ordenação ou síntese no cliente e na camada de dados", () => {
    const PROIBIDO =
      /\b(\.sort\(|percent|progresso|\.reverse\(|toSorted|localeCompare)\b|percentual/i;
    const blocoDados = FONTE_DADOS.slice(FONTE_DADOS.indexOf("export function useAnalysisTimeline"));
    const corpo = blocoDados.slice(0, blocoDados.indexOf("\n}"));
    expect(PROIBIDO.test(corpo), "a camada de dados passou a calcular a linha do tempo").toBe(false);
    const blocoCliente = FONTE_CLIENTE.slice(FONTE_CLIENTE.indexOf("getTimeline: ("));
    expect(PROIBIDO.test(blocoCliente.slice(0, 300))).toBe(false);
  });

  it.runIf(eventosDisponivel)("nenhum campo de `nunca_publicos` vira PROPRIEDADE do tipo", () => {
    // A 1ª versão procurava `\bcampo\b` no bloco e reprovou em `result` — que é nunca-público
    // como NOME DE CAMPO, e ao mesmo tempo prefixo do tipo de evento `result.available`, que é
    // contratado. O `.` é fronteira de palavra, então a âncora acusava o instrumento, não o
    // código. Aqui a busca é por POSIÇÃO DE PROPRIEDADE (`nome:`), que é onde um campo vazaria.
    const { nunca_publicos } = lerEventos();
    expect(nunca_publicos.length).toBeGreaterThan(0);
    const bloco = FONTE_TIPOS.slice(FONTE_TIPOS.indexOf("// ── Linha do tempo (M23)"));
    const comoPropriedade = (campo: string) => new RegExp(`\\b${campo}\\s*[?]?\\s*:`);

    // Controle positivo: sem ele, um erro de construção da regex tornaria o laço abaixo vácuo.
    expect(comoPropriedade("object_key").test("  object_key: string;")).toBe(true);
    expect(comoPropriedade("result").test("  data: { result_available: unknown }")).toBe(false);

    for (const campo of nunca_publicos) {
      expect(bloco, `\`${campo}\` é nunca-público e virou propriedade do tipo`).not.toMatch(
        comoPropriedade(campo),
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Erros — só o catálogo público
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 5. as negativas", () => {
  it("não-encontrado/proibido chega como `forbidden_or_not_found`", async () => {
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json(
          { code: "forbidden_or_not_found", detail: "not_found" },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const erro = await cliente()
      .getTimeline("an-abc", ESCOPO)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ProblemError);
    expect((erro as ProblemError).problem.code).toBe("forbidden_or_not_found");
  });

  it("o Orchestrator indisponível vira `temporarily_unavailable`, retentável", async () => {
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json(
          { code: "temporarily_unavailable", detail: "orchestrator_unavailable" },
          { status: 503, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const erro = await cliente()
      .getTimeline("an-abc", ESCOPO)
      .catch((e: unknown) => e);

    const p = (erro as ProblemError).problem;
    expect(p.code).toBe("temporarily_unavailable");
    expect(p.retryable).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. B1 FECHADO
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M23 · 6. o blocker B1", () => {
  it("`SEM_CLIENTE_NO_FRONT` contém exatamente a dívida REABERTA pela BD02", () => {
    // A M23 zerou esta lista e fechou B1. A BD02 o reabriu ao publicar `create_instance`,
    // `list_instances` e `get_instance` sem cliente no Front — e este caso passou a medir o
    // conjunto vigente em vez de `[]`, porque "vazia" era estado global que a M23 não podia
    // congelar contra missões futuras.
    //
    // Trajetória: 3 agora → 1 após a M36 (`create_instance`) → 0 após a M37, quando B1 fecha.
    expect([...SEM_CLIENTE_NO_FRONT].sort(), "a dívida de B1 divergiu do declarado").toEqual(
      ["POST /v1/instances"].sort(),
    );
  });

  it("`missing_in_front` é EXATAMENTE a dívida declarada — nem mais, nem menos", () => {
    const doc = JSON.parse(
      readFileSync(resolve(origem.escolhida!.caminho, "public-v1.json"), "utf-8"),
    );
    const ops = operacoesDoContrato(doc);
    const cli = operacoesDoCliente(FONTE_CLIENTE);
    const diff = compararOperacoes(ops, cli, tiposDeclarados(FONTE_TIPOS));

    expect(ops.length, "âncora quebrada: contrato sem operações").toBeGreaterThan(0);
    // A divergência REAL tem de bater com a DECLARADA, e não ser zero: a BD02 publicou três
    // operações de Instance sem cliente no Front, e elas estão declaradas com dona (M36/M37).
    // Comparar contra a declaração — em vez de contra `[]` — mantém a recusa nos dois sentidos:
    // operação nova não declarada reprova, e declaração que sobrou depois de o cliente existir
    // também. Exigir `[]` aqui obrigaria a escrever cliente de missão futura só para o gate.
    expect(
      [...diff.missing_in_front].sort(),
      "operação contratada sem cliente e sem declaração",
    ).toEqual([...SEM_CLIENTE_NO_FRONT].sort());
    // As outras categorias também precisam estar limpas: um `path_mismatch` faria a operação
    // "existir" com o endereço errado, e `missing_in_front` vazio mentiria.
    expect(diff.path_mismatch).toEqual([]);
    expect(diff.method_mismatch).toEqual([]);
    expect(diff.projection_mismatch).toEqual([]);
  });

  it("a lista fica VAZIA, não apagada — é ela que acusa a próxima operação sem cliente", () => {
    const fonte = readFileSync(resolve(RAIZ, "src/test/v1/divergenciaDeclarada.ts"), "utf-8");
    expect(fonte).toContain("SEM_CLIENTE_NO_FRONT");
  });
});
