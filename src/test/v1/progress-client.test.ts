// M20 — o cliente de `/progress`, contra o servidor de verdade (MSW) e contra o contrato.
//
// ## O que este cliente NÃO faz, e por que isso é a parte importante
//
// Ele não agrega. O plano põe agregação fora de escopo e a Constituição já dizia que os quatro
// eixos nunca viram barra única — porque um percentual único seria a média de coisas
// incomparáveis: "Engine 100% + Analytics retido" não tem meio-termo aritmético. O número
// apareceria na tela com cara de medida e seria opinião do front.
//
// Ele também não completa. Eixo ausente é ausente — não vira `pending`. A diferença é entre "o
// backend ainda não disse" e "o backend disse que não começou", e a tela precisa poder distinguir.
//
// ## Vocabulários próprios
//
// `withheld` só existe em `analytics`; `expired` e `unavailable` só em `export`; `partial` só em
// `analytics`. Um enum comum aceitaria `expired` num eixo que nunca expira. Os tipos separados
// travam isso no compilador — e os casos aqui travam a lista contra o CONTRATO, para que os dois
// não divirjam em silêncio.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createV1Client, ProblemError } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { resolverOrigemDoContrato } from "./contractOrigin";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const ESCOPO = { workspaceId: "ws-1" };
const cliente = () => createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });

const origem = resolverOrigemDoContrato();
const contrato = JSON.parse(
  readFileSync(resolve(origem.escolhida!.caminho, "public-v1.json"), "utf-8"),
) as Record<string, unknown>;

const AXES = contrato.progress_axes as string[];
const STATES = contrato.progress_states as Record<string, string[]>;

const RESPOSTA = {
  analysis_id: "an-abc",
  axes: [
    { axis: "engine", state: "ready" },
    { axis: "analytics", state: "withheld" },
    { axis: "export", state: "unavailable" },
    { axis: "final_result", state: "pending" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — o contrato publica o que este arquivo afirma medir
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 1. o contrato tem o que julgar", () => {
  it("a origem resolve e publica `progress_axes` e `progress_states`", () => {
    expect(origem.motivo).not.toBe("ambigua");
    expect(AXES, "`progress_axes` ausente no contrato").toHaveLength(4);
    expect(Object.keys(STATES).sort(), "`progress_states` divergiu dos eixos").toEqual(
      [...AXES].sort(),
    );
  });

  it("a operação está em `operations[]` — a BD07 a manteve", () => {
    const ops = contrato.operations as { operationId: string; method: string; path: string }[];
    const op = ops.find((o) => o.operationId === "get_analysis_progress");
    expect(op, "`get_analysis_progress` sumiu do contrato").toBeTruthy();
    expect(op?.method).toBe("GET");
    expect(op?.path).toBe("/v1/analyses/{analysis_id}/progress");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. O cliente fala com o endereço e o método CONTRATADOS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 2. método, caminho e escopo saem como contratado", () => {
  it("`GET /v1/analyses/{id}/progress?workspace_id=…`", async () => {
    let visto: { metodo: string; url: URL } | null = null;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id/progress`, ({ request }) => {
        visto = { metodo: request.method, url: new URL(request.url) };
        return HttpResponse.json(RESPOSTA);
      }),
    );
    await cliente().getProgress("an-abc", ESCOPO);

    expect(visto, "o cliente não chamou a rota de progresso").not.toBeNull();
    expect(visto!.metodo).toBe("GET");
    expect(visto!.url.pathname).toBe("/v1/analyses/an-abc/progress");
    // Tenant-scope no fio, não só na query key: o backend precisa do workspace para autorizar.
    expect(visto!.url.searchParams.get("workspace_id")).toBe("ws-1");
  });

  it("o `analysis_id` é escapado — id hostil não vira caminho", async () => {
    let caminho = "";
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id/progress`, ({ request }) => {
        caminho = new URL(request.url).pathname;
        return HttpResponse.json(RESPOSTA);
      }),
    );
    await cliente().getProgress("an/../../etc", ESCOPO).catch(() => undefined);
    expect(caminho, "id não escapado atravessou o caminho").not.toContain("/../");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O cliente ENTREGA o que recebeu — sem agregar, sem completar
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 3. nenhum cálculo semântico novo", () => {
  it("devolve os 4 eixos como vieram", async () => {
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id/progress`, () => HttpResponse.json(RESPOSTA)));
    const r = await cliente().getProgress("an-abc", ESCOPO);
    expect(r.axes).toEqual(RESPOSTA.axes);
    expect(r.analysis_id).toBe("an-abc");
  });

  it("NÃO inventa percentual, total nem campo agregado", async () => {
    // O coração do "fora de escopo". Qualquer chave a mais aqui seria o front respondendo uma
    // pergunta que ninguém fez, com um número que ninguém mediu.
    server.use(http.get(`${MSW_BASE}/v1/analyses/:id/progress`, () => HttpResponse.json(RESPOSTA)));
    const r = (await cliente().getProgress("an-abc", ESCOPO)) as unknown as Record<string, unknown>;
    expect(Object.keys(r).sort()).toEqual(["analysis_id", "axes"]);
    for (const proibido of ["percent", "percentual", "progress", "total", "overall", "completed"]) {
      expect(Object.keys(r), `o cliente agregou \`${proibido}\``).not.toContain(proibido);
    }
  });

  it("eixo AUSENTE continua ausente — não vira `pending`", async () => {
    // Ausência ≠ zero, e aqui ≠ "não começou". "O backend ainda não disse" e "o backend disse que
    // não começou" são fatos diferentes; completar a lista apagaria o primeiro.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id/progress`, () =>
        HttpResponse.json({ analysis_id: "an-abc", axes: [{ axis: "engine", state: "running" }] }),
      ),
    );
    const r = await cliente().getProgress("an-abc", ESCOPO);
    expect(r.axes, "o cliente completou os eixos que o backend não mandou").toHaveLength(1);
  });

  it("lista vazia continua vazia", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id/progress`, () =>
        HttpResponse.json({ analysis_id: "an-abc", axes: [] }),
      ),
    );
    expect((await cliente().getProgress("an-abc", ESCOPO)).axes).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Os vocabulários por eixo batem com o CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 4. cada eixo tem o vocabulário que o contrato publica", () => {
  const TIPOS = readFileSync(resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts"), "utf-8");
  const DECLARADO: Record<string, string> = {
    engine: "EngineAxisState",
    analytics: "AnalyticsAxisState",
    export: "ExportAxisState",
    final_result: "FinalResultAxisState",
  };

  for (const eixo of ["engine", "analytics", "export", "final_result"]) {
    it(`\`${eixo}\` — os ${STATES[eixo]?.length} estados do contrato estão no tipo`, () => {
      const nome = DECLARADO[eixo];
      const bloco = TIPOS.slice(TIPOS.indexOf(`export type ${nome}`));
      const corpo = bloco.slice(0, bloco.indexOf(";"));
      for (const estado of STATES[eixo]) {
        expect(corpo, `\`${nome}\` não declara \`${estado}\``).toContain(`"${estado}"`);
      }
    });
  }

  for (const eixo of ["engine", "analytics", "export", "final_result"]) {
    it(`\`${eixo}\` — o tipo NÃO declara estado que o contrato não publica`, () => {
      // A direção inversa, e ela faltava: o caso acima ia contrato -> tipo, então um estado A MAIS
      // no tipo passava. Foi o que a mutação "expired entra em analytics" provou — o tipo passou a
      // aceitar um estado que aquele eixo nunca tem, e nada reclamou.
      const nome = DECLARADO[eixo];
      const bloco = TIPOS.slice(TIPOS.indexOf(`export type ${nome}`));
      const corpo = bloco.slice(0, bloco.indexOf(";"));
      const noTipo = [...corpo.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
      const aMais = noTipo.filter((e) => !STATES[eixo].includes(e));
      expect(aMais, `\`${nome}\` declara estado fora do contrato`).toEqual([]);
      expect(noTipo.length, `\`${nome}\` sem estados — o recorte falhou`).toBeGreaterThan(2);
    });
  }

  it("os vocabulários NÃO colapsam — cada eixo tem estado que os outros não têm", () => {
    // Se colapsassem, um enum único bastaria — e aceitaria `expired` num eixo que nunca expira.
    expect(STATES.analytics, "`withheld` deixou de ser exclusivo de analytics").toContain("withheld");
    expect(STATES.engine).not.toContain("withheld");
    expect(STATES.export, "`expired` deixou de ser exclusivo de export").toContain("expired");
    expect(STATES.analytics).not.toContain("expired");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Erro — o modelo público já definido, sem tradução nova
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 5. o erro chega como problem+json canônico", () => {
  for (const [status, code] of [
    [404, "forbidden_or_not_found"],
    [503, "capacity_wait"],
  ] as const) {
    it(`${status} vira \`ProblemError\` com \`${code}\``, async () => {
      server.use(
        http.get(`${MSW_BASE}/v1/analyses/:id/progress`, () =>
          HttpResponse.json(
            { type: `https://sentinela/problems/${code}`, title: code, status, code },
            { status, headers: { "content-type": "application/problem+json" } },
          ),
        ),
      );
      await expect(cliente().getProgress("an-abc", ESCOPO)).rejects.toBeInstanceOf(ProblemError);
      await cliente()
        .getProgress("an-abc", ESCOPO)
        .catch((e: ProblemError) => expect(e.problem.code).toBe(code));
    });
  }

  it("sem token, nem chega à rede", async () => {
    const semToken = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => null });
    await expect(semToken.getProgress("an-abc", ESCOPO)).rejects.toBeInstanceOf(ProblemError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. A dívida B1 encolheu
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M20 · 6. `/progress` saiu de SEM_CLIENTE_NO_FRONT", () => {
  it("a operação não é mais declarada como sem cliente", async () => {
    const { SEM_CLIENTE_NO_FRONT } = await import("./divergenciaDeclarada");
    expect(
      [...SEM_CLIENTE_NO_FRONT],
      "`/progress` tem cliente agora — a declaração precisa encolher no mesmo commit",
    ).not.toContain("GET /v1/analyses/{analysis_id}/progress");
  });

  it("a dívida contém EXATAMENTE o que está declarado — nada a mais", () => {
    // Honestidade sobre o blocker, e a catraca continua recusando nos DOIS sentidos: item novo
    // não declarado reprova, item declarado que já tem cliente também.
    //
    // Era `2` desde a M20; a M22 levou a `1`; a M23 zerou e a Fase 3 encerrou. A **BD02**
    // reabriu B1 ao publicar três operações de Instance sem cliente no Front — e o caso deixou
    // de afirmar "vazia" porque essa era uma afirmação GLOBAL que a M20 não tem como sustentar:
    // qualquer missão futura que publique contrato a derruba. O que a M20 prova é o de baixo:
    // que a operação DELA saiu.
    return import("./divergenciaDeclarada").then(({ SEM_CLIENTE_E_SEM_MISSAO_DONA }) => {
      // B1 = sem cliente E SEM MISSÃO DONA. A lista inteira é comparada com a divergência
      // REAL em `contract-operations.test.ts`, e num lugar só — repetir o literal aqui
      // fazia esta face cair junto com as outras quatro a cada operação nova.
      expect([...SEM_CLIENTE_E_SEM_MISSAO_DONA].sort()).toEqual([]);
    });
  });
});
