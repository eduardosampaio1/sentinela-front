// M42 · CFG-03 / CFG-04 — os gates dos scenarios de configuração.
//
// A missão é MASSA, não UI. O que estes casos guardam é o que o Front de amanhã vai poder
// concluir a partir dos mocks — e, principalmente, o que ele **não** vai poder concluir sem que
// algo fique vermelho aqui primeiro.
//
// Três famílias:
//
//   WG1–WG12  Workspace (CFG-03, BD12)
//   IG1–IG10  Instance  (CFG-04, BD13)
//   C1–C6     fronteira entre os dois donos
//
// Todos exercitam os handlers REAIS do catálogo, pelos nomes dos scenarios — não uma cópia
// montada aqui. Um gate que monte os próprios handlers prova que o gate funciona.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { CATALOGO, handlersDoScenario } from "@/mocks/scenarios";
import {
  BASELINE_DA_INSTANCIA,
  CAMPOS_DA_INSTANCE,
  CAMPOS_DO_WORKSPACE,
  CAMPOS_PROIBIDOS,
  CLAIM_DESATUALIZADA,
  INSTANCIA_CONFIG,
  INSTANCIA_VIZINHA,
  NOME_DUPLICADO,
  NOME_NA_CLAIM,
  WORKSPACE_CORRENTE,
  WORKSPACE_RENOMEADO,
} from "@/test/fixtures/public-v1/workspace-instance-config";

const BASE = "http://mock.test";
const servidor = setupServer();

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

/** Monta o scenario pelo NOME. É o mesmo caminho que o browser e o Storybook usam. */
function servir(id: string) {
  servidor.use(...handlersDoScenario(id, BASE));
}

const WS = WORKSPACE_CORRENTE.workspace_id;
const rotaWs = (id = WS) => `${BASE}/v1/workspaces/${id}`;
const rotaInst = (id: string) => `${BASE}/v1/instances/${id}`;

const patch = (url: string, corpo: unknown) =>
  fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });

// ══════════════════════════════════════════════════════════════════════════════════════════
// WG · Workspace
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("WG · CFG-03 Workspace", () => {
  it("WG1 · o estado corrente vem do produtor público, com os três campos publicados", async () => {
    servir("workspace-config-current");
    const r = await fetch(rotaWs());
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual([...CAMPOS_DO_WORKSPACE].sort());
    expect(corpo.name).toBe(WORKSPACE_CORRENTE.name);
  });

  it("WG2 · rename PRESERVA o workspace_id", async () => {
    servir("workspace-config-current");
    const r = await patch(rotaWs(), { name: WORKSPACE_RENOMEADO });
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo.workspace_id).toBe(WS);
  });

  it("WG3 · rename muda SOMENTE name — created_at fica", async () => {
    servir("workspace-config-current");
    const corpo = (await (await patch(rotaWs(), { name: WORKSPACE_RENOMEADO })).json()) as Record<
      string,
      unknown
    >;
    expect(corpo.name).toBe(WORKSPACE_RENOMEADO);
    expect(corpo.created_at).toBe(WORKSPACE_CORRENTE.created_at);
    expect(Object.keys(corpo).sort()).toEqual([...CAMPOS_DO_WORKSPACE].sort());
  });

  it("WG4 · o GET POSTERIOR vê o novo nome (a escrita persistiu, não ecoou)", async () => {
    servir("workspace-config-current");
    await patch(rotaWs(), { name: WORKSPACE_RENOMEADO });
    const corpo = (await (await fetch(rotaWs())).json()) as Record<string, unknown>;
    expect(corpo.name).toBe(WORKSPACE_RENOMEADO);
    expect(corpo.workspace_id).toBe(WS);
  });

  it("WG4b · cada invocação do scenario parte do estado CANÔNICO", async () => {
    // Sem isto, o rename de um caso vazaria para o seguinte e o segundo teste passaria a medir
    // o estado que o primeiro deixou.
    servir("workspace-config-current");
    const corpo = (await (await fetch(rotaWs())).json()) as Record<string, unknown>;
    expect(corpo.name).toBe(WORKSPACE_CORRENTE.name);
  });

  it("WG4c · renomear para o MESMO nome é 200 — o contrato não declara conflito", async () => {
    servir("workspace-config-current");
    const r = await patch(rotaWs(), { name: WORKSPACE_CORRENTE.name });
    expect(r.status).toBe(200);
    expect(((await r.json()) as Record<string, unknown>).name).toBe(WORKSPACE_CORRENTE.name);
  });

  it("WG5 · a claim NÃO vence o produtor: os dois nomes divergem, e o canônico é o do produtor", async () => {
    servir("workspace-config-stale-claim");
    const claim = (await (await fetch(`${BASE}/v1/me`)).json()) as {
      workspaces: { id: string; name: string }[];
    };
    const produtor = (await (await fetch(rotaWs())).json()) as Record<string, unknown>;

    // A divergência é o ponto. Se um dia as duas massas coincidirem, este gate deixa de medir.
    expect(claim.workspaces[0].name).toBe(NOME_NA_CLAIM);
    expect(produtor.name).toBe(WORKSPACE_CORRENTE.name);
    expect(claim.workspaces[0].name).not.toBe(produtor.name);
    // E o MESMO workspace: a armadilha só existe porque não há como distinguir por id.
    expect(claim.workspaces[0].id).toBe(produtor.workspace_id);
  });

  it("WG6 · 503 NÃO vira nome confirmado pela claim, e não vira 'não existe'", async () => {
    servir("workspace-config-unavailable");
    const r = await fetch(rotaWs());
    expect(r.status).toBe(503);
    const p = (await r.json()) as Record<string, unknown>;
    expect(p.code).toBe("temporarily_unavailable");
    expect(p.retryable).toBe(true);
    // O corpo do problema não pode carregar o nome da claim: um `name` aqui seria exatamente o
    // fallback confirmado que o contrato proíbe.
    expect(JSON.stringify(p)).not.toContain(NOME_NA_CLAIM);
    expect(JSON.stringify(p)).not.toContain(WORKSPACE_CORRENTE.name);

    // E a claim CONTINUA respondendo 200 — a identidade não depende do owner de Workspace. É a
    // convivência das duas coisas que torna o cenário perigoso, e é ela que precisa existir.
    expect((await fetch(`${BASE}/v1/me`)).status).toBe(200);
  });

  it("WG6b · o PATCH também degrada em 503 — a escrita não inventa sucesso local", async () => {
    servir("workspace-config-unavailable");
    const r = await patch(rotaWs(), { name: WORKSPACE_RENOMEADO });
    expect(r.status).toBe(503);
  });

  it("WG6c · invisível é 404 forbidden_or_not_found, e o anti-oracle é preservado", async () => {
    servir("workspace-config-invisible");
    const get = await fetch(rotaWs());
    const pat = await patch(rotaWs(), { name: WORKSPACE_RENOMEADO });
    expect([get.status, pat.status]).toEqual([404, 404]);
    for (const r of [get, pat]) {
      const p = (await r.json()) as Record<string, unknown>;
      // A MESMA resposta para os três motivos que o contrato colapsa. Um `detail` que
      // diferenciasse seria o oráculo de existência que a fronteira esconde de propósito.
      expect(p.code).toBe("forbidden_or_not_found");
      expect(String(p.detail)).not.toMatch(/n[aã]o existe|inexistente|papel|role|outro workspace/i);
    }
  });

  it("WG7/WG8/WG9/WG10 · sem create, sem delete, sem membership e sem settings genérico", async () => {
    const catalogo = JSON.stringify(
      CATALOGO.filter((s) => s.superficies.includes("CFG-03")).map((s) => s.id),
    );
    expect(catalogo).not.toMatch(/create|delete|member|invite|role|settings/i);

    // E o handler: nenhuma rota de coleção de Workspace, em nenhum verbo. `onUnhandledRequest:
    // "error"` faz o servidor recusar o que ninguém declarou — então a ausência é medida pela
    // recusa, não por leitura de código.
    servir("workspace-config-current");
    await expect(fetch(`${BASE}/v1/workspaces`, { method: "POST" })).rejects.toThrow();
    await expect(fetch(rotaWs(), { method: "DELETE" })).rejects.toThrow();
    await expect(fetch(`${BASE}/v1/workspaces/${WS}/members`)).rejects.toThrow();
    await expect(fetch(`${BASE}/v1/workspaces/${WS}/settings`)).rejects.toThrow();
  });

  it("WG10b · o corpo do rename recusa campo a mais — extra=forbid, não 'ignora'", async () => {
    servir("workspace-config-current");
    for (const corpo of [
      { name: "X", slug: "x" },
      { name: "X", members: [] },
      { name: "X", settings: {} },
      { slug: "x" },
      { name: "" },
      {},
    ]) {
      const r = await patch(rotaWs(), corpo);
      expect(r.status, JSON.stringify(corpo)).toBe(400);
      expect(((await r.json()) as Record<string, unknown>).code).toBe("invalid_input");
    }
    // E nada foi escrito: um 400 que escreve é pior que um 500.
    expect(((await (await fetch(rotaWs())).json()) as Record<string, unknown>).name).toBe(
      WORKSPACE_CORRENTE.name,
    );
  });

  it("WG11/WG12 · o mock público não conhece store legado, token S2S nem rota interna", () => {
    // A fronteira que o mock representa é o GATEWAY PÚBLICO. Uma URL interna, um token S2S ou o
    // nome de uma tabela legada aqui ensinariam a tela a conhecer o que ela não pode conhecer.
    //
    // A primeira versão deste gate serializava o CATÁLOGO com `JSON.stringify` — e a campanha de
    // mutação provou que isso mede quase nada: `JSON.stringify` **descarta funções**, então o
    // corpo dos `handlers` (que é onde o vazamento moraria) nunca era olhado, e comentário nenhum
    // entra num objeto serializado. Duas mutações sobreviveram exatamente aí.
    //
    // Agora lê o CÓDIGO-FONTE, com os comentários removidos: o cadeado que lê a prosa mede a
    // explicação, e estes arquivos explicam justamente o que é proibido.
    const semComentarios = (caminho: string) =>
      readFileSync(resolve(__dirname, caminho), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

    const fonte = [
      semComentarios("../../mocks/scenarios/catalogo.ts"),
      semComentarios("../fixtures/public-v1/workspace-instance-config.ts"),
    ]
      .join("\n")
      .toLowerCase();

    for (const proibido of [
      "pgcontextstore",
      "pg_context",
      "internal-token",
      "x-internal",
      "orchestrator.internal",
      "/internal/",
      "s2s",
      "workspaces_legacy",
    ]) {
      expect(fonte, proibido).not.toContain(proibido);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// IG · Instance
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("IG · CFG-04 Instance", () => {
  it("IG1 · identidade estável e forma publicada", async () => {
    servir("instance-config-current");
    const corpo = (await (
      await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))
    ).json()) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual([...CAMPOS_DA_INSTANCE].sort());
    expect(corpo.instance_id).toBe(INSTANCIA_CONFIG.instance_id);
  });

  it("IG2/IG3 · rename preserva instance_id e created_at, e muda só name", async () => {
    servir("instance-config-current");
    const corpo = (await (
      await patch(rotaInst(INSTANCIA_CONFIG.instance_id), { name: "Suporte Nível 2" })
    ).json()) as Record<string, unknown>;
    expect(corpo.instance_id).toBe(INSTANCIA_CONFIG.instance_id);
    expect(corpo.created_at).toBe(INSTANCIA_CONFIG.created_at);
    expect(corpo.name).toBe("Suporte Nível 2");
    expect(Object.keys(corpo).sort()).toEqual([...CAMPOS_DA_INSTANCE].sort());
  });

  it("IG4 · o GET posterior vê o novo nome", async () => {
    servir("instance-config-current");
    await patch(rotaInst(INSTANCIA_CONFIG.instance_id), { name: "Suporte Nível 2" });
    const corpo = (await (
      await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))
    ).json()) as Record<string, unknown>;
    expect(corpo.name).toBe("Suporte Nível 2");
  });

  it("IG5 · nome DUPLICADO é permitido — renomear a vizinha para o nome ocupado é 200", async () => {
    servir("instance-config-current");
    const r = await patch(rotaInst(INSTANCIA_VIZINHA.instance_id), { name: NOME_DUPLICADO });
    expect(r.status).toBe(200);
    const lista = (await (await fetch(`${BASE}/v1/instances`)).json()) as {
      items: { instance_id: string; name: string }[];
    };
    const homonimas = lista.items.filter((i) => i.name === NOME_DUPLICADO);
    expect(homonimas).toHaveLength(2);
    // Duas linhas, MESMO nome, identidades diferentes. É o que mata a inferência de unicidade.
    expect(new Set(homonimas.map((i) => i.instance_id)).size).toBe(2);
  });

  it("IG5b · o ESTADO homônimo existe no catálogo, e não só como transição", async () => {
    servir("instance-config-duplicate-name");
    const lista = (await (await fetch(`${BASE}/v1/instances`)).json()) as {
      items: { instance_id: string; name: string }[];
    };
    expect(lista.items.filter((i) => i.name === NOME_DUPLICADO)).toHaveLength(2);
  });

  it("IG5c · renomear para o MESMO nome é 200", async () => {
    servir("instance-config-current");
    const r = await patch(rotaInst(INSTANCIA_CONFIG.instance_id), {
      name: INSTANCIA_CONFIG.name,
    });
    expect(r.status).toBe(200);
  });

  it("IG6 · rename NÃO altera a Baseline Reference", async () => {
    servir("instance-config-current");
    const antes = (await (
      await fetch(`${rotaInst(INSTANCIA_CONFIG.instance_id)}/baseline`)
    ).json()) as Record<string, unknown>;
    expect(antes.baseline_analysis_id).toBe(BASELINE_DA_INSTANCIA.baseline_analysis_id);

    await patch(rotaInst(INSTANCIA_CONFIG.instance_id), { name: "Outro Nome Qualquer" });

    const depois = (await (
      await fetch(`${rotaInst(INSTANCIA_CONFIG.instance_id)}/baseline`)
    ).json()) as Record<string, unknown>;
    expect(depois).toEqual(antes);
    // E o baseline nunca entrou na view da Instance: ele é capacidade PRÓPRIA, não configuração.
    const view = (await (
      await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))
    ).json()) as Record<string, unknown>;
    expect(view).not.toHaveProperty("baseline_analysis_id");
    expect(view).not.toHaveProperty("baseline_set_at");
  });

  it("IG7 · rename NÃO é recreate: a identidade sobrevive e nenhuma linha nova aparece", async () => {
    servir("instance-config-current");
    const antes = (await (await fetch(`${BASE}/v1/instances`)).json()) as { items: unknown[] };
    await patch(rotaInst(INSTANCIA_CONFIG.instance_id), { name: "Renomeada" });
    const depois = (await (await fetch(`${BASE}/v1/instances`)).json()) as {
      items: { instance_id: string }[];
    };
    expect(depois.items).toHaveLength(antes.items.length);
    expect(depois.items.map((i) => i.instance_id)).toContain(INSTANCIA_CONFIG.instance_id);
    // E o recurso continua alcançável pelo MESMO id — um recreate teria trocado a chave.
    expect((await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))).status).toBe(200);
  });

  it("IG8 · sem description/tags/slug — nem na view, nem aceitos na escrita", async () => {
    servir("instance-config-current");
    // TODAS as Instances, não só a primeira. A campanha de mutação pôs `slug` na VIZINHA e o
    // gate sobreviveu: ele inspecionava um único elemento de uma massa que existe em par.
    const lista = (await (await fetch(`${BASE}/v1/instances`)).json()) as {
      items: Record<string, unknown>[];
    };
    expect(lista.items.length).toBeGreaterThanOrEqual(2);
    for (const item of lista.items) {
      expect(Object.keys(item).sort()).toEqual([...CAMPOS_DA_INSTANCE].sort());
      for (const proibido of CAMPOS_PROIBIDOS) {
        expect(item, `${String(item.instance_id)} · ${proibido}`).not.toHaveProperty(proibido);
      }
    }
    const view = (await (
      await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))
    ).json()) as Record<string, unknown>;
    for (const proibido of CAMPOS_PROIBIDOS) {
      expect(view, proibido).not.toHaveProperty(proibido);
    }
    for (const corpo of [
      { name: "X", description: "d" },
      { name: "X", tags: ["a"] },
      { name: "X", slug: "x" },
      { name: "X", baseline_analysis_id: "an-1" },
    ]) {
      const r = await patch(rotaInst(INSTANCIA_CONFIG.instance_id), corpo);
      expect(r.status, JSON.stringify(corpo)).toBe(400);
    }
    // E não existe sub-recurso genérico de configuração.
    await expect(fetch(`${rotaInst(INSTANCIA_CONFIG.instance_id)}/settings`)).rejects.toThrow();
    await expect(fetch(`${rotaInst(INSTANCIA_CONFIG.instance_id)}/config`)).rejects.toThrow();
  });

  it("IG9 · 503 NÃO vira not-found — e a Instance não some", async () => {
    servir("instance-config-unavailable");
    const r = await fetch(rotaInst(INSTANCIA_CONFIG.instance_id));
    expect(r.status).toBe(503);
    const p = (await r.json()) as Record<string, unknown>;
    expect(p.code).toBe("temporarily_unavailable");
    expect(p.code).not.toBe("forbidden_or_not_found");
    expect(p.retryable).toBe(true);
  });

  it("IG10 · anti-oracle preservado: inexistente e de outro workspace colapsam", async () => {
    servir("instance-config-invisible");
    const r = await fetch(rotaInst("inst-nao-existe"));
    expect(r.status).toBe(404);
    const p = (await r.json()) as Record<string, unknown>;
    expect(p.code).toBe("forbidden_or_not_found");
    expect(String(p.detail)).not.toMatch(/n[aã]o existe|inexistente|outro workspace/i);

    // E no scenario corrente, um id desconhecido dá a MESMA resposta que o invisível — é isso
    // que impede a tela de usar o par (200, 404) como oráculo de existência.
    servidor.resetHandlers();
    servir("instance-config-current");
    const r2 = await fetch(rotaInst("inst-nao-existe"));
    expect(r2.status).toBe(404);
    expect(((await r2.json()) as Record<string, unknown>).code).toBe("forbidden_or_not_found");
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// C · fronteira entre os dois donos
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("C · CFG-03 × CFG-04 são donos diferentes", () => {
  it("C1 · rename de Workspace não toca estado de Instance", async () => {
    servir("workspace-config-current");
    servidor.use(...handlersDoScenario("instance-config-current", BASE));
    const antes = await (await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))).json();
    await patch(rotaWs(), { name: WORKSPACE_RENOMEADO });
    expect(await (await fetch(rotaInst(INSTANCIA_CONFIG.instance_id))).json()).toEqual(antes);
  });

  it("C2 · rename de Instance não toca estado de Workspace", async () => {
    servir("workspace-config-current");
    servidor.use(...handlersDoScenario("instance-config-current", BASE));
    const antes = await (await fetch(rotaWs())).json();
    await patch(rotaInst(INSTANCIA_CONFIG.instance_id), { name: "Mexido" });
    expect(await (await fetch(rotaWs())).json()).toEqual(antes);
  });

  it("C3 · nenhum scenario devolve um objeto único com os dois estados", async () => {
    // Um `settings`/`configuration` que carregasse `workspace` e `instance` juntos seria a
    // primeira peça de um `configurationEngine` — e ele nasceria no mock, antes de qualquer
    // decisão de produto.
    for (const id of ["workspace-config-current", "instance-config-current"]) {
      servidor.resetHandlers();
      servir(id);
      const alvo =
        id === "workspace-config-current" ? rotaWs() : rotaInst(INSTANCIA_CONFIG.instance_id);
      const corpo = (await (await fetch(alvo)).json()) as Record<string, unknown>;
      const chaves = Object.keys(corpo);
      expect(chaves).not.toContain("settings");
      expect(chaves).not.toContain("configuration");
      // A prova forte: quem tem `workspace_id` não tem `instance_id`, e vice-versa.
      expect(chaves.includes("workspace_id") && chaves.includes("instance_id")).toBe(false);
    }
  });

  it("C4/C5/C6 · nenhum scenario de configuração chama Account, Dispatcher, ARGOS ou Analytics", async () => {
    const config = CATALOGO.filter((s) => s.superficies.some((x) => x === "CFG-03" || x === "CFG-04"));
    expect(config.length).toBeGreaterThanOrEqual(8);
    const fonte = JSON.stringify(config);
    for (const proibido of [
      "/v1/me/language",
      "/v1/subscriptions",
      "/analytics",
      "argos",
      "dispatcher",
      "account",
    ]) {
      expect(fonte.toLowerCase(), proibido).not.toContain(proibido.toLowerCase());
    }

    // E, servindo CADA UM deles, essas rotas simplesmente não existem.
    //
    // O `JSON.stringify` acima não basta e a mutação provou: ele descarta os `handlers`, que são
    // funções — um `/v1/subscriptions` acrescentado dentro do construtor passava intacto. A prova
    // que vale é servir o scenario e ver a requisição ser RECUSADA por falta de handler.
    for (const id of ["workspace-config-current", "instance-config-current"]) {
      servidor.resetHandlers();
      servir(id);
      await expect(fetch(`${BASE}/v1/me/language`), id).rejects.toThrow();
      await expect(fetch(`${BASE}/v1/subscriptions?workspace_id=${WS}`), id).rejects.toThrow();
      await expect(fetch(`${BASE}/v1/analyses/an-1/analytics`), id).rejects.toThrow();
    }
  });

  it("C7 · o mock público não aceita autorização inventada no corpo", async () => {
    servir("workspace-config-current");
    const r = await patch(rotaWs(), { name: "X", authorized: true });
    expect(r.status).toBe(400);
    // E pedir um workspace pelo caminho não é prova de permissão: outro id é recusado.
    expect((await fetch(rotaWs("ws-de-outra-pessoa"))).status).toBe(404);
  });

  it("C8 · a claim da armadilha NÃO carrega configuração — só contexto", async () => {
    const chaves = Object.keys(CLAIM_DESATUALIZADA.workspaces[0]).sort();
    expect(chaves).toEqual(["id", "name", "role"]);
    expect(Object.keys(CLAIM_DESATUALIZADA).sort()).toEqual([
      "capabilities",
      "user",
      "workspaces",
    ]);
  });
});
