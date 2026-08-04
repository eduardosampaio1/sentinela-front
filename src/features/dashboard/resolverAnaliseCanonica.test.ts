// De onde a rota de compatibilidade tira o `analysis_id` — e de onde ela NÃO tira.
//
// Aposentadoria do dashboard legado (preparação local do Big Bang). Nada aqui ativa nada.
//
// Cinco destes invariantes MIGRARAM de `contexts/AnalysisContext.historia.test.tsx`, que morreu
// com o contexto. A pergunta que aquele arquivo fazia — "quem responde se este workspace tem
// análise?" — continua valendo; o que mudou foi quem faz a pergunta.

import { describe, expect, it, vi } from "vitest";

import type { AnalysisListItem, AnalysisListPage, V1Client } from "@/lib/v1";
import { MAX_PAGINAS, resolverAnaliseCanonica } from "./resolverAnaliseCanonica";

function item(
  analysis_id: string,
  status: AnalysisListItem["status"],
  result_available = true,
): AnalysisListItem {
  return { analysis_id, status, result_available, record_count: 10, created_at: null };
}

/** O mock carrega a assinatura REAL de `V1Client["list"]`.
 *
 *  `vi.fn(async () => …)`, sem tipo, produz um mock de ZERO parâmetros — e aí `mock.calls` é a
 *  tupla vazia, então `calls[0][0]` é `TS2493`. Os três erros estavam aqui desde que este
 *  arquivo nasceu, invisíveis porque `features/dashboard` não pertencia a projeto de typecheck
 *  nenhum.
 *
 *  Tipar não é calar o compilador: agora o mock precisa ACEITAR o que o cliente real aceita, e
 *  a asserção sobre `calls[0][0]` passa a falar do parâmetro de verdade — se `ListParams`
 *  mudar, este teste sente. */
function clienteQueDevolve(...paginas: AnalysisListPage[]) {
  const list = vi.fn<V1Client["list"]>(
    async () => paginas.shift() ?? { items: [], next_cursor: null },
  );
  return { client: { list }, list };
}

describe("a fonte do id é a listagem canônica, escopada pelo workspace", () => {
  it("chama `list` com o workspace autenticado", async () => {
    const { client, list } = clienteQueDevolve({ items: [item("an-1", "completed")], next_cursor: null });

    await resolverAnaliseCanonica(client, "ws-A");

    expect(list).toHaveBeenCalledTimes(1);
    expect(list.mock.calls[0][0]).toMatchObject({ workspaceId: "ws-A" });
  });

  it("o escopo NÃO carrega project/environment", async () => {
    // O eixo de três níveis é contexto de produto legado; a autoridade de tenant é o workspace
    // autenticado. Mandar project/environment aqui reintroduziria um segundo eixo de isolamento.
    const { client, list } = clienteQueDevolve({ items: [item("an-1", "completed")], next_cursor: null });

    await resolverAnaliseCanonica(client, "ws-A");

    // A pergunta é sobre as chaves OBSERVADAS, não sobre o tipo. `ListParams` já não declara
    // `projectId`/`environmentId`, mas tipo não impede que um `spread` acidental carregue a
    // chave em runtime — e é essa a falha que este teste precisa pegar.
    //
    // O `as Record<string, unknown>` que estava aqui só compilava enquanto o mock era destipado.
    // Assim que ele ganhou a assinatura real, o compilador recusou a conversão (`TS2352`) — e
    // recusou com razão: ela afirmava que `ListParams` tem chaves arbitrárias.
    const chaves = Object.keys(list.mock.calls[0][0]);
    expect(chaves).toEqual(expect.arrayContaining(["workspaceId"]));
    expect(chaves).not.toContain("projectId");
    expect(chaves).not.toContain("environmentId");
  });

  it("uma falha da chamada PROPAGA — não vira 'não tem análise'", async () => {
    // "Não consegui perguntar" e "não existe" são coisas diferentes. Engolir o erro aqui faria
    // a tela dizer ao usuário que ele não tem análise porque a rede caiu.
    const client = {
      list: vi.fn(async () => {
        throw new Error("rede");
      }),
    };
    await expect(resolverAnaliseCanonica(client, "ws-A")).rejects.toThrow("rede");
  });
});

describe("qual análise é escolhida", () => {
  it("a primeira abrível da listagem — que vem ordenada por criação decrescente", async () => {
    const { client } = clienteQueDevolve({
      items: [item("an-nova", "completed"), item("an-velha", "completed")],
      next_cursor: null,
    });

    const r = await resolverAnaliseCanonica(client, "ws-A");

    expect(r).toEqual({ tipo: "ENCONTRADA", analysisId: "an-nova" });
  });

  it("`completed` SEM resultado disponível é pulada", async () => {
    // A conjunção não é redundância: a análise termina e o resultado ainda pode estar sendo
    // materializado. Redirecionar para lá entregaria uma página de resultado sem resultado.
    const { client } = clienteQueDevolve({
      items: [item("an-sem-resultado", "completed", false), item("an-ok", "completed", true)],
      next_cursor: null,
    });

    const r = await resolverAnaliseCanonica(client, "ws-A");

    expect(r).toEqual({ tipo: "ENCONTRADA", analysisId: "an-ok" });
  });

  it("estados em andamento não são escolhidos", async () => {
    const { client } = clienteQueDevolve({
      items: [item("an-run", "running"), item("an-q", "queued"), item("an-f", "failed")],
      next_cursor: null,
    });

    const r = await resolverAnaliseCanonica(client, "ws-A");

    expect(r.tipo).toBe("SEM_CONCLUIDA");
  });

  it("segue o cursor até achar", async () => {
    const { client, list } = clienteQueDevolve(
      { items: [item("an-run", "running")], next_cursor: "c1" },
      { items: [item("an-ok", "completed")], next_cursor: null },
    );

    const r = await resolverAnaliseCanonica(client, "ws-A");

    expect(r).toEqual({ tipo: "ENCONTRADA", analysisId: "an-ok" });
    expect(list.mock.calls[1][0]).toMatchObject({ cursor: "c1" });
  });
});

describe("os três desfechos são distintos — e a tela precisa deles", () => {
  it("listagem vazia = SEM_ANALISE", async () => {
    const { client } = clienteQueDevolve({ items: [], next_cursor: null });
    expect(await resolverAnaliseCanonica(client, "ws-A")).toEqual({ tipo: "SEM_ANALISE" });
  });

  it("havia análises, nenhuma concluída, listagem EXAURIDA", async () => {
    const { client } = clienteQueDevolve({ items: [item("an-run", "running")], next_cursor: null });

    const r = await resolverAnaliseCanonica(client, "ws-A");

    // `exauriu: true` é o que autoriza a frase "nenhuma concluída". Sem chegar ao fim, dizer
    // isso seria inventar.
    expect(r).toEqual({ tipo: "SEM_CONCLUIDA", examinadas: 1, exauriu: true });
  });

  it("o limite de páginas para a varredura — e o desfecho diz que NÃO exauriu", async () => {
    // Bounded de propósito: um workspace com muitas análises em andamento não pode fazer a
    // rota varrer a listagem inteira. E a honestidade está em `exauriu: false` — a tela não
    // pode afirmar "não existe nenhuma" com base numa busca que parou no meio.
    const list = vi.fn(async () => ({ items: [item("an-run", "running")], next_cursor: "sempre" }));

    const r = await resolverAnaliseCanonica({ list }, "ws-A");

    expect(list).toHaveBeenCalledTimes(MAX_PAGINAS);
    expect(r).toEqual({ tipo: "SEM_CONCLUIDA", examinadas: MAX_PAGINAS, exauriu: false });
  });
});

describe("o id NÃO vem do navegador", () => {
  it("nem storage semeado com um id antigo muda a resolução", async () => {
    // Era exatamente daqui que o dashboard legado tirava o que mostrar.
    window.sessionStorage.setItem("sentinela:last_cache_key", "sentinela:analysis:an-do-cache");
    window.sessionStorage.setItem(
      "sentinela:analysis:an-do-cache",
      JSON.stringify({ analysis_id: "an-do-cache" }),
    );
    window.localStorage.setItem("sentinela:history:ws-A", "1");

    const { client } = clienteQueDevolve({ items: [item("an-do-backend", "completed")], next_cursor: null });
    const r = await resolverAnaliseCanonica(client, "ws-A");

    expect(r).toEqual({ tipo: "ENCONTRADA", analysisId: "an-do-backend" });

    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("o módulo não menciona storage do navegador", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fonte = fs
      .readFileSync(path.resolve(__dirname, "resolverAnaliseCanonica.ts"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const porta of ["sessionStorage", "localStorage", "indexedDB", "document.cookie", "location.hash"]) {
      expect(fonte, `o resolvedor usa ${porta}`).not.toContain(porta);
    }
  });
});
