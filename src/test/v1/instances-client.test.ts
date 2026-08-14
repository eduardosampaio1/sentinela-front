// M36 · checkpoint 2 — os clients de Instance, provados pelos scenarios OFICIAIS.
//
// A massa não é escrita aqui: vem de `instance-empty`, `instance-present` e `instance-history`,
// que o Blueprint §11 mapeia e o catálogo serve. Um teste que montasse o próprio payload provaria
// que o cliente sabe ler o que o teste escreveu — não que sabe ler o que o produtor manda.
//
// Não há validator em runtime, e isso é o padrão do repo, não omissão: a compatibilidade
// estrutural é garantida por TypeScript + `contract-sync` + `fixtures-presas-ao-schema`, que
// comparam binding e fixtures contra `public-v1.json`. Criar parser só para Instance seria a
// primeira assimetria de treze operações.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createV1Client, ProblemError } from "@/lib/v1";
import { handlersDoScenario } from "@/mocks/scenarios";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { INSTANCIA } from "@/test/fixtures/public-v1/instances";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const ESCOPO = { workspaceId: "ws-1" };
const cliente = () => createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });

/** Liga um scenario oficial do catálogo ao MSW — a mesma massa que a superfície vai consumir. */
const cenario = (nome: string) => server.use(...handlersDoScenario(nome, MSW_BASE));

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. listInstances
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M36 · 1. listInstances", () => {
  it("`instance-present`: devolve a Instance com os campos publicados", async () => {
    cenario("instance-present");
    const pagina = await cliente().listInstances(ESCOPO);
    expect(pagina.items).toHaveLength(1);
    expect(pagina.items[0].instance_id).toBe(INSTANCIA.instance_id);
    expect(pagina.items[0].name).toBe(INSTANCIA.name);
    expect(pagina.next_cursor).toBeNull();
  });

  it("`instance-empty`: lista vazia é SUCESSO, não erro", async () => {
    // Workspace autorizado ainda sem Instance é estado legítimo. Tratá-lo como erro faria a tela
    // pedir ao usuário que resolvesse algo que não está quebrado.
    cenario("instance-empty");
    await expect(cliente().listInstances(ESCOPO)).resolves.toEqual({
      items: [],
      next_cursor: null,
    });
  });

  it("nenhuma Default Instance nasce do vazio", async () => {
    cenario("instance-empty");
    const pagina = await cliente().listInstances(ESCOPO);
    expect(pagina.items).toEqual([]);
  });

  it("`limit` e `cursor` viajam quando informados", async () => {
    let vista: URL | null = null;
    server.use(
      // Handler-espião: o que interessa é o que o cliente ENVIOU.
      http.get(`${MSW_BASE}/v1/instances`, ({ request }) => {
        vista = new URL(request.url);
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
    );
    await cliente().listInstances({ ...ESCOPO, limit: 10, cursor: "cur-9" });
    expect(vista!.searchParams.get("limit")).toBe("10");
    expect(vista!.searchParams.get("cursor")).toBe("cur-9");
    expect(vista!.searchParams.get("workspace_id")).toBe("ws-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. getInstance — a identidade que sustenta deep link
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M36 · 2. getInstance", () => {
  it("recupera pela identidade, SEM listar antes", async () => {
    // É esta independência que o refresh e o deep link exigem: a tela chega sabendo só o
    // `instance_id`, e não pode depender de uma listagem que ninguém carregou.
    cenario("instance-present");
    const um = await cliente().getInstance(INSTANCIA.instance_id, ESCOPO);
    expect(um.instance_id).toBe(INSTANCIA.instance_id);
    expect(um.name).toBe(INSTANCIA.name);
  });

  it("list → get devolvem a MESMA identidade", async () => {
    cenario("instance-present");
    const c = cliente();
    const daLista = (await c.listInstances(ESCOPO)).items[0];
    const doGet = await c.getInstance(daLista.instance_id, ESCOPO);
    expect(doGet.instance_id).toBe(daLista.instance_id);
    expect(doGet.name).toBe(daLista.name);
  });

  it("`created_at: null` é aceito — o contrato o publica nullable", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/instances/:id`, () =>
        HttpResponse.json({ instance_id: "i-1", name: "X", created_at: null }),
      ),
    );
    await expect(cliente().getInstance("i-1", ESCOPO)).resolves.toMatchObject({
      created_at: null,
    });
  });

  it("erro público chega como ProblemError, sem o Front distinguir o que o contrato colapsa", async () => {
    // `forbidden_or_not_found` é um código só de propósito: Instance alheia e inexistente são
    // indistinguíveis. Traduzir isso aqui em "não existe" ou "sem permissão" seria reintroduzir
    // o oráculo de existência que o backend fecha.
    server.use(
      http.get(`${MSW_BASE}/v1/instances/:id`, () =>
        HttpResponse.json(
          { type: "urn:sentinela:error:forbidden_or_not_found", code: "forbidden_or_not_found", status: 404 },
          { status: 404 },
        ),
      ),
    );
    await expect(cliente().getInstance("i-1", ESCOPO)).rejects.toBeInstanceOf(ProblemError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A precondição de tenant, que já existia — e continua valendo para Instance
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M36 · 3. fail-closed de workspace, preservado", () => {
  it("workspace vazio recusa ANTES da rede, nos dois métodos novos", async () => {
    // A regra mora no transporte e não foi duplicada nos métodos de Instance. Este caso prova
    // que herdá-la bastou: um `workspaceId` vazio (estado transitório "workspace não carregado")
    // sairia sem escopo de tenant, e o transporte o recusa localmente.
    let tocou = false;
    server.use(
      http.get(`${MSW_BASE}/v1/instances`, () => {
        tocou = true;
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
      http.get(`${MSW_BASE}/v1/instances/:id`, () => {
        tocou = true;
        return HttpResponse.json({ instance_id: "x", name: "x", created_at: null });
      }),
    );
    const c = cliente();
    await expect(c.listInstances({ workspaceId: "" })).rejects.toBeInstanceOf(ProblemError);
    await expect(c.getInstance("i-1", { workspaceId: "  " })).rejects.toBeInstanceOf(ProblemError);
    expect(tocou, "a requisição sem tenant chegou à rede").toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A seam do histórico — `instanceId` → `instance_id`
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M36 · 4. filtro por Instance na listagem de Analyses", () => {
  it("`instanceId` é serializado como `instance_id` na query", async () => {
    cenario("instance-history");
    const pagina = await cliente().list({ ...ESCOPO, instanceId: INSTANCIA.instance_id });
    // O handler do scenario RECUSA responder sem o filtro — devolve vazio. Página com itens só
    // acontece se o `instance_id` chegou.
    expect(pagina.items.length).toBeGreaterThan(0);
    for (const item of pagina.items) {
      expect(item.instance_id).toBe(INSTANCIA.instance_id);
    }
  });

  it("sem `instanceId`, a listagem geral não muda de forma", async () => {
    // Consumidor antigo não percebe a seam: o loop de query descarta `undefined`, então a
    // requisição sai byte a byte igual à de antes.
    let vista: URL | null = null;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        vista = new URL(request.url);
        return HttpResponse.json({ items: [], next_cursor: null });
      }),
    );
    await cliente().list(ESCOPO);
    expect(vista!.searchParams.has("instance_id")).toBe(false);
  });

  it("o cursor continua atravessando a fronteira de página COM o filtro", async () => {
    cenario("instance-history");
    const c = cliente();
    const p1 = await c.list({ ...ESCOPO, instanceId: INSTANCIA.instance_id });
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await c.list({
      ...ESCOPO,
      instanceId: INSTANCIA.instance_id,
      cursor: p1.next_cursor,
    });
    const ids = [...p1.items, ...p2.items].map((x) => x.analysis_id);
    expect(p2.next_cursor).toBeNull();
    expect(new Set(ids).size, "a paginação repetiu").toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. B1 — a dívida encolheu, e só ela
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M36 · 5. B1 vai de 3 para 1", () => {
  it("`list_instances` e `get_instance` saíram da declaração", async () => {
    const { SEM_CLIENTE_NO_FRONT } = await import("./divergenciaDeclarada");
    expect([...SEM_CLIENTE_NO_FRONT]).not.toContain("GET /v1/instances");
    expect([...SEM_CLIENTE_NO_FRONT]).not.toContain("GET /v1/instances/{analysis_id}");
  });

  it("`create_instance` CONTINUA — e não fecha na M37 também", async () => {
    // Criar Instance é `Fora` do escopo desta missão. Tirar daqui sem ter o cliente seria
    // declarar fechado o que ninguém entregou — `create_instance` não tem missão dona.
    const { SEM_CLIENTE_E_SEM_MISSAO_DONA } = await import("./divergenciaDeclarada");
    // B1 = sem cliente E SEM MISSÃO DONA. A lista inteira é comparada com a divergência
    // REAL em `contract-operations.test.ts`, e num lugar só — repetir o literal aqui
    // fazia esta face cair junto com as outras quatro a cada operação nova.
    expect([...SEM_CLIENTE_E_SEM_MISSAO_DONA]).toEqual(["POST /v1/instances"]);
  });

  it("os dois métodos existem de verdade no client canônico", async () => {
    // Contra a declaração encolher sem o cliente nascer: o inventory lê ESTE arquivo.
    const fonte = readFileSync(resolve(RAIZ, "src/lib/v1/client.ts"), "utf-8");
    expect(fonte).toContain('"/v1/instances"');
    expect(fonte).toContain("/v1/instances/${encodeAnalysisId(instanceId)}");
    const c = cliente();
    expect(typeof c.listInstances).toBe("function");
    expect(typeof c.getInstance).toBe("function");
  });
});
