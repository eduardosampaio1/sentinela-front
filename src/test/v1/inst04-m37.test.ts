// M37 · INST-04 — a análise nasce presa à Instância, provada contra o scenario OFICIAL.
//
// A massa vem de `instance-new-analysis`, que o Blueprint §11 mapeia e o catálogo serve. Ele é o
// único cenário do catálogo com MEMÓRIA, e por um motivo: a associação **não volta** na resposta
// do `prepare` (`{analysis_id, status}`). Ela só é legível depois, no `instance_id` do read model
// de status. Um teste que se contentasse com o 201 não provaria associação nenhuma.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createV1Client } from "@/lib/v1";
import { handlersDoScenario } from "@/mocks/scenarios";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { INSTANCIA, OUTRA_INSTANCIA } from "@/test/fixtures/public-v1/instances";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(?<!:)\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const ESCOPO = { workspaceId: "ws-1" };
const cliente = () => createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
const cenario = (nome: string) => server.use(...handlersDoScenario(nome, MSW_BASE));

const PAGINA = "src/features/instances/InstancePage.tsx";
const HOOK = "src/features/canonical-analysis/ui/useIniciarAnalise.ts";
const CLIENT = "src/lib/v1/client.ts";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. A associação — nasce no write, e só é legível no read
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M37 · 1. a análise nasce presa à Instância", () => {
  it("o `prepare` leva o `instance_id` e o status posterior o confirma", async () => {
    cenario("instance-new-analysis");
    const c = cliente();
    const handle = await c.prepare({ ...ESCOPO, instanceId: INSTANCIA.instance_id });
    expect(handle.analysis_id, "o prepare não devolveu identidade").toBeTruthy();

    // A PROVA. Se o campo não tivesse viajado, o status viria com `null` — e o 201 acima teria
    // passado do mesmo jeito.
    const status = await c.getStatus(handle.analysis_id, ESCOPO);
    expect(status.instance_id, "a análise nasceu solta").toBe(INSTANCIA.instance_id);
  });

  it("leva EXATAMENTE a Instância pedida, e não 'alguma'", async () => {
    // O scenario serve DUAS Instances de propósito: com uma só, mandar a errada seria
    // indistinguível de mandar a certa.
    cenario("instance-new-analysis");
    const c = cliente();
    const h = await c.prepare({ ...ESCOPO, instanceId: OUTRA_INSTANCIA.instance_id });
    const status = await c.getStatus(h.analysis_id, ESCOPO);
    expect(status.instance_id).toBe(OUTRA_INSTANCIA.instance_id);
    expect(status.instance_id).not.toBe(INSTANCIA.instance_id);
  });

  it("o campo viaja na QUERY — o corpo do prepare não o carrega", async () => {
    // O Gateway real declara `instance_id: Annotated[str | None, Query()]`. Este caso observa a
    // requisição de verdade: um cliente que o pusesse no corpo passaria no teste anterior contra
    // um mock permissivo, e falharia contra o Gateway.
    cenario("instance-new-analysis");
    let url = ""; let corpo: string | null = null;
    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST" && request.url.includes("/v1/analyses")) {
        url = request.url;
        corpo = await request.clone().text();
      }
    });
    await cliente().prepare({ ...ESCOPO, instanceId: INSTANCIA.instance_id });
    expect(new URL(url).searchParams.get("instance_id")).toBe(INSTANCIA.instance_id);
    expect(corpo ?? "", "o `instance_id` foi parar no CORPO do prepare").not.toContain("instance_id");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. A jornada geral não regride
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M37 · 2. sem contexto continua válido", () => {
  it("preparar sem Instância funciona, e a análise fica visivelmente SOLTA", async () => {
    cenario("instance-new-analysis");
    const c = cliente();
    const h = await c.prepare(ESCOPO);
    expect(h.analysis_id, "a ausência de Instância virou erro").toBeTruthy();
    const status = await c.getStatus(h.analysis_id, ESCOPO);
    expect(status.instance_id, "sem contexto, a análise tem de aparecer solta").toBeNull();
  });

  it("sem contexto, a query NÃO ganha o parâmetro — requisição igual à de antes", async () => {
    cenario("instance-new-analysis");
    let url = "";
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && request.url.includes("/v1/analyses")) url = request.url;
    });
    await cliente().prepare(ESCOPO);
    expect(new URL(url).searchParams.has("instance_id"), "parâmetro vazio vazou na jornada geral").toBe(false);
  });

  it("o tipo mantém o campo OPCIONAL — a jornada geral não passa a exigi-lo", () => {
    const tipos = semComentarios(ler("src/lib/v1/contract/public-v1.types.ts"));
    expect(tipos).toMatch(/interface PrepareParams extends CanonicalScope \{\s*instanceId\?: string;/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Identidade — vem da rota, nunca do nome nem do cache
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M37 · 3. a identidade é a durável", () => {
  it("a página passa ao hook o `instanceId` da ROTA, não o nome nem o objeto carregado", () => {
    const f = semComentarios(ler(PAGINA));
    expect(f, "a intenção não recebeu a identidade da rota").toContain("useIniciarAnalise(instanceId)");
    expect(f).not.toContain("useIniciarAnalise(inst.name");
    expect(f).not.toContain("useIniciarAnalise(instancia.data");
  });

  it("o contexto NÃO é guardado em storage nem em navigation state", () => {
    // Deep link e refresh funcionam porque cada fase tem a sua identidade no endereço:
    // `/instances/:instanceId` antes do prepare, `/analyses/:analysis_id` depois.
    const f = semComentarios(ler(HOOK));
    for (const proibido of ["localStorage", "sessionStorage", "state:", "useLocation"]) {
      expect(f, `o contexto de Instância passou a depender de ${proibido}`).not.toContain(proibido);
    }
  });

  it("existe UM disparo de prepare, e ele é o do clique", () => {
    expect(semComentarios(ler(HOOK)).split("create.mutate(").length - 1).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O que a M37 NÃO pode ter trazido
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M37 · 4. INST-07, criação de Instância e B1", () => {
  it("nenhuma configuração de Instância entrou pela porta dos fundos", () => {
    const f = semComentarios(ler(PAGINA)) + semComentarios(ler("src/features/instances/InstancesListPage.tsx"));
    for (const proibido of ["rename", "settings", "preferences", "PATCH", "updateInstance", "deleteInstance"]) {
      expect(f, `INST-07 reapareceu: ${proibido}`).not.toContain(proibido);
    }
  });

  it("o Front continua sem client de `create_instance`", () => {
    const c = semComentarios(ler(CLIENT));
    expect(c).not.toContain("createInstance");
    expect(c, "surgiu um POST para /v1/instances").not.toMatch(/pedir<[^>]*>\(\s*"POST",\s*"\/v1\/instances"/);
  });

  it("B1 permanece em 1", async () => {
    const { SEM_CLIENTE_NO_FRONT } = await import("./divergenciaDeclarada");
    expect([...SEM_CLIENTE_NO_FRONT]).toEqual(["POST /v1/instances"]);
  });
});
