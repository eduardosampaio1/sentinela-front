// Provas 5, 7 e 8 da dívida de `sessionStorage` — limpeza legada, ausência no código/bundle,
// e a rota de compatibilidade.
//
// Preparação local do Big Bang. Nada aqui ativa nada.

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PREFIXOS_LEGADOS,
  limparResultadosLegadosDoNavegador,
} from "@/lib/legacyBrowserStorage";

const RAIZ = path.resolve(__dirname, "../../..");
const SRC = path.join(RAIZ, "src");

/** Código sem comentários — senão o cadeado mede a prosa que EXPLICA a remoção. */
function semComentarios(caminho: string): string {
  return fs
    .readFileSync(caminho, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// ── prova 5 — as chaves legadas são apagadas na inicialização ─────────────────

describe("prova 5 — limpeza defensiva das chaves legadas", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("apaga o blob do resultado e o ponteiro, nos dois storages", () => {
    // As formas EXATAS que o código removido produzia, com os sufixos dinâmicos reais.
    window.sessionStorage.setItem("sentinela:analysis:hash-abc", '{"consistency_score":72}');
    window.sessionStorage.setItem("sentinela:last_cache_key:ws-1:none:none", "sentinela:analysis:hash-abc");
    window.sessionStorage.setItem("sentinela:last_cache_key", "sentinela:analysis:hash-abc");
    window.localStorage.setItem("sentinela:analysis:an-9", '{"alerts":[]}');

    const removidas = limparResultadosLegadosDoNavegador();

    expect(removidas.sort()).toEqual(
      [
        "sentinela:analysis:an-9",
        "sentinela:analysis:hash-abc",
        "sentinela:last_cache_key",
        "sentinela:last_cache_key:ws-1:none:none",
      ].sort(),
    );
    expect(window.sessionStorage.getItem("sentinela:analysis:hash-abc")).toBeNull();
    expect(window.localStorage.getItem("sentinela:analysis:an-9")).toBeNull();
  });

  it("NÃO apaga estado legítimo — de terceiros nem da própria aplicação", () => {
    // Este é o motivo de existir `removeItem` em vez de `clear()`. Um `clear()` passaria no
    // teste acima e reprovaria aqui: trocaria um problema de privacidade por um de corretude.
    window.localStorage.setItem("sentinela:history:ws-1", "1");
    window.localStorage.setItem("sentinela:language", "pt");
    window.sessionStorage.setItem("__chunk_reload__", "1");
    window.localStorage.setItem("terceiro:qualquer-coisa", "preserve");

    limparResultadosLegadosDoNavegador();

    expect(window.localStorage.getItem("sentinela:history:ws-1")).toBe("1");
    expect(window.localStorage.getItem("sentinela:language")).toBe("pt");
    expect(window.sessionStorage.getItem("__chunk_reload__")).toBe("1");
    expect(window.localStorage.getItem("terceiro:qualquer-coisa")).toBe("preserve");
  });

  it("NÃO apaga a chave VIZINHA de nome parecido", () => {
    // `startsWith("sentinela:last_cache_key")` puro pegava `sentinela:last_cache_keyboard` e
    // qualquer `..._v2` legítimo de amanhã. Apagar o vizinho pelo nome parecido é o erro do
    // `clear()` em escala menor — e mais difícil de notar, porque a vítima é uma chave só.
    window.localStorage.setItem("sentinela:last_cache_keyboard", "preserve");
    window.localStorage.setItem("sentinela:last_cache_key_v2", "preserve");
    window.localStorage.setItem("sentinela:analysis_backup", "preserve");
    // E as formas REAIS continuam saindo — senão a correção viraria "não apaga nada".
    window.localStorage.setItem("sentinela:last_cache_key", "some");
    window.localStorage.setItem("sentinela:last_cache_key:ws-1:none:none", "some");
    window.localStorage.setItem("sentinela:analysis:x", "some");

    const removidas = limparResultadosLegadosDoNavegador();

    expect(removidas.sort()).toEqual(
      ["sentinela:analysis:x", "sentinela:last_cache_key", "sentinela:last_cache_key:ws-1:none:none"].sort(),
    );
    expect(window.localStorage.getItem("sentinela:last_cache_keyboard")).toBe("preserve");
    expect(window.localStorage.getItem("sentinela:last_cache_key_v2")).toBe("preserve");
    expect(window.localStorage.getItem("sentinela:analysis_backup")).toBe("preserve");
  });

  it("apaga TODAS as chaves quando há várias — sem pular por reindexação", () => {
    // `storage.key(i)` reindexa a cada remoção. Apagar dentro do laço pula chaves, e o defeito
    // é silencioso: com 4 chaves, sobram 2 e o teste de 1 chave passaria mesmo assim.
    for (let i = 0; i < 8; i += 1) {
      window.sessionStorage.setItem(`sentinela:analysis:k${i}`, "x");
    }
    expect(window.sessionStorage.length).toBe(8);

    limparResultadosLegadosDoNavegador();

    expect(window.sessionStorage.length).toBe(0);
  });

  it("é idempotente e não quebra com storage vazio", () => {
    expect(limparResultadosLegadosDoNavegador()).toEqual([]);
    expect(limparResultadosLegadosDoNavegador()).toEqual([]);
  });

  it("a limpeza é CHAMADA no arranque da aplicação", () => {
    // Sem isto, a função poderia estar perfeita e nunca executar — o modo de falha recorrente
    // deste programa. `main.tsx` não é montável em teste (cria a raiz do DOM real), então a
    // prova aqui é estrutural: o import existe e a chamada existe.
    // SEM COMENTÁRIOS. Uma mutação que apenas comenta a chamada
    // (`// limparResultadosLegadosDoNavegador();`) mantém a string no arquivo, e um
    // `toContain` sobre o texto cru passa verde medindo a prosa. Foi o que a mutação s9 provou.
    const main = semComentarios(path.join(SRC, "main.tsx"));
    expect(main).toContain("limparResultadosLegadosDoNavegador");
    expect(main, "a função é importada mas nunca chamada").toContain(
      "limparResultadosLegadosDoNavegador();",
    );
    // ANTES do render: uma limpeza depois do primeiro paint deixa a janela em que a cópia
    // antiga ainda está lá enquanto a aplicação já roda.
    // Compara com a CHAMADA `createRoot(`, não com a linha de import: o import fica no
    // topo do arquivo e a comparação daria sempre falso.
    expect(
      main.indexOf("limparResultadosLegadosDoNavegador();"),
      "a limpeza roda depois do render",
    ).toBeLessThan(main.indexOf("createRoot(rootEl"));
  });

  it("os prefixos cobrem as duas famílias de chave que existiam", () => {
    expect([...PREFIXOS_LEGADOS]).toEqual(["sentinela:analysis:", "sentinela:last_cache_key"]);
  });
});

// ── prova 7 — nenhuma chamada ativa a saveResult (código-fonte) ───────────────

function arquivosDeCodigo(dir: string): string[] {
  const achados: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const alvo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules") continue;
      achados.push(...arquivosDeCodigo(alvo));
    } else if (/\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)) {
      // Arquivos de TESTE ficam de fora: eles citam os símbolos proibidos por nome,
      // porque é o trabalho deles. Incluí-los faz o cadeado acusar a si mesmo — e um
      // cadeado que acusa quem se comporta bem é desligado.
      achados.push(alvo);
    }
  }
  return achados;
}

describe("prova 7 — o cache de resultado não existe mais no código", () => {
  const arquivos = arquivosDeCodigo(SRC);

  it("varreu o `src` inteiro (o laço não pode iterar sobre nada)", () => {
    expect(arquivos.length).toBeGreaterThan(100);
  });

  // Os símbolos que compunham o cache. `saveResult` é o escritor; os outros são o resto da
  // máquina — deixar qualquer um deles de pé seria manter a peça esperando ser religada.
  for (const simbolo of [
    "saveResult",
    "loadResult",
    "loadLastResult",
    "isSessionCached",
    "cacheKeyFor",
    "workspaceScopedLastKey",
    "hashDataset",
  ]) {
    it(`\`${simbolo}\` não aparece em nenhum código ativo`, () => {
      const culpados = arquivos
        .filter((a) => new RegExp(`\\b${simbolo}\\b`).test(semComentarios(a)))
        .map((a) => path.relative(SRC, a));
      expect(culpados).toEqual([]);
    });
  }

  it("nenhum módulo fora da limpeza legada grava resultado em storage persistente", () => {
    // Denylist das PORTAS de persistência, avaliada sobre os módulos da jornada e da API.
    // `lib/legacyBrowserStorage.ts` é a exceção declarada: ele existe para APAGAR.
    const portas = [/\bindexedDB\b/, /\bcaches\.open\b/, /\bdocument\.cookie\b/, /\bcaches\.match\b/];
    const culpados: string[] = [];
    for (const a of arquivos) {
      const rel = path.relative(SRC, a);
      if (rel.includes("legacyBrowserStorage")) continue;
      const src = semComentarios(a);
      for (const porta of portas) {
        if (porta.test(src)) culpados.push(`${rel}: ${porta.source}`);
      }
    }
    expect(culpados).toEqual([]);
  });

  it("`lib/api.ts` não toca em storage nenhum", () => {
    const src = semComentarios(path.join(SRC, "lib/api.ts"));
    expect(/\bsessionStorage\b/.test(src)).toBe(false);
    expect(/\blocalStorage\b/.test(src)).toBe(false);
  });
});

// ── prova 8 — a rota de compatibilidade não persiste resultado ────────────────

describe("prova 8 — a rota de compatibilidade só redireciona", () => {
  it("`/dashboard/history/:id` navega para a página canônica e não guarda nada", () => {
    const router = semComentarios(path.join(SRC, "app/router.tsx"));
    const inicio = router.indexOf("function RedirecionaDetalheLegado()");
    expect(inicio, "a rota de compatibilidade sumiu do router").toBeGreaterThan(-1);
    const corpo = router.slice(inicio, router.indexOf("\n}", inicio));

    // O que ela FAZ: redirecionar para o caminho canônico, que consulta o Gateway.
    expect(corpo).toContain("/canonical/analyses/");
    expect(corpo).toContain("Navigate");

    // O que ela NÃO faz.
    for (const proibido of ["sessionStorage", "localStorage", "indexedDB", "document.cookie", "saveResult"]) {
      expect(corpo, `a rota de compatibilidade usa ${proibido}`).not.toContain(proibido);
    }
  });

  it("o router inteiro não persiste resultado", () => {
    const router = semComentarios(path.join(SRC, "app/router.tsx"));
    for (const proibido of ["sessionStorage", "localStorage", "indexedDB", "document.cookie"]) {
      expect(router, `o router usa ${proibido}`).not.toContain(proibido);
    }
  });
});
