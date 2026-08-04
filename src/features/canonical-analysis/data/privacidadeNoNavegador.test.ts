// Privacidade no navegador — o que a jornada canônica NÃO deixa na máquina do usuário.
//
// Preparação local do Big Bang: provas sobre o código local candidato. Nada aqui ativa nada.
//
// O dado do cliente é sanitizado no Ingestion, e o Gateway devolve só vocabulário público. Se
// a jornada guardasse conteúdo no navegador, a sanitização do servidor seria irrelevante para
// quem tem acesso à máquina — e nenhum purge alcançaria essa cópia.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..");

function arquivosDaJornada(): string[] {
  const achados: string[] = [];
  const visitar = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const alvo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) visitar(alvo);
      else if (/\.tsx?$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)) {
        achados.push(alvo);
      }
    }
  };
  visitar(RAIZ);
  return achados;
}

/**
 * Código sem comentários.
 *
 * Sem isto o cadeado mede a PROSA, não o programa: `UploadStep.tsx` abre com um comentário
 * dizendo "NADA de FileReader/.text()/.arrayBuffer()" — a declaração do invariante — e uma
 * busca crua acusa justamente o arquivo que promete o contrário do que ela leu.
 *
 * A direção do erro importa: um cadeado que acusa quem se comporta bem é abandonado, e um
 * cadeado abandonado não protege nada.
 */
function codigo(caminho: string): string {
  return fs
    .readFileSync(caminho, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("a jornada canônica não deixa dado no navegador", () => {
  const arquivos = arquivosDaJornada();

  it("encontra os arquivos da jornada (o teste não pode passar por lista vazia)", () => {
    // Sem esta asserção, um erro de caminho faria o laço abaixo iterar sobre nada e o teste
    // ficaria verde afirmando ausência que nunca verificou.
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it("nenhum arquivo da jornada usa localStorage ou sessionStorage", () => {
    const culpados = arquivos.filter((a) => {
      const src = codigo(a);
      return /\b(localStorage|sessionStorage)\b/.test(src);
    });
    expect(culpados.map((c) => path.relative(RAIZ, c))).toEqual([]);
  });

  it("nenhum arquivo da jornada usa IndexedDB, Cache API ou cookie", () => {
    // As outras três portas de persistência no navegador. Fechar só `localStorage` deixaria
    // as outras abertas e a prova valeria menos do que parece.
    const culpados = arquivos.filter((a) => {
      const src = codigo(a);
      return /\b(indexedDB|caches\.open|document\.cookie)\b/.test(src);
    });
    expect(culpados.map((c) => path.relative(RAIZ, c))).toEqual([]);
  });

  it("a jornada não lê o CONTEÚDO do arquivo do usuário", () => {
    // `FileReader`/`.text()`/`arrayBuffer()` trariam os bytes do cliente para a memória da
    // aba — e daí para um preview, um log ou um estado de React. O upload é repassado como
    // corpo da requisição, sem o frontend olhar dentro.
    const culpados = arquivos.filter((a) => {
      const src = codigo(a);
      return /\bFileReader\b|\.arrayBuffer\(\)|readAsText/.test(src);
    });
    expect(culpados.map((c) => path.relative(RAIZ, c))).toEqual([]);
  });
});

describe("dívida declarada do caminho legado", () => {
  it("`saveResult` do legado guarda o resultado em sessionStorage — e some com o legado", () => {
    // Este teste NÃO é uma proibição: é um registro executável de uma dívida conhecida.
    //
    // `src/lib/api.ts` persiste o `AnalysisResult` inteiro em `sessionStorage`. É o caminho
    // legado, que o Big Bang apaga junto com `analyzeConversations`. Enquanto ele existir, a
    // cópia no navegador existe — e nenhum purge do servidor a alcança.
    //
    // O teste falha no dia em que o legado sumir, e aí ele deve ser REMOVIDO junto: um
    // lembrete que sobrevive ao seu motivo vira ruído.
    const legado = fs.readFileSync(path.resolve(RAIZ, "../../lib/api.ts"), "utf-8");
    expect(
      /sessionStorage\.setItem/.test(legado),
      "o legado parou de usar sessionStorage: remova este lembrete",
    ).toBe(true);
  });
});
