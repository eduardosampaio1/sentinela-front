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

  // As formas de trazer os bytes do cliente para a memória da aba — e daí para um preview, um
  // log ou um estado de React. O upload é repassado como corpo da requisição, sem o frontend
  // olhar dentro. A lista precisa cobrir a família INTEIRA: fechar `readAsText` e deixar
  // `readAsArrayBuffer` aberto é um cadeado com a promessa maior que o alcance.
  const LEITURAS = [
    /\bFileReader\b/,
    /\breadAsText\b/,
    /\breadAsArrayBuffer\b/,
    /\breadAsBinaryString\b/,
    /\breadAsDataURL\b/,
    /\.arrayBuffer\(\)/,
    /\.text\(\)/,
    /\.stream\(\)/,
    /\bcreateObjectURL\b/, // não lê, mas expõe o conteúdo a um preview/nova aba
  ];

  for (const padrao of LEITURAS) {
    it(`a jornada não lê o CONTEÚDO do arquivo do usuário via ${padrao.source}`, () => {
      const culpados = arquivos.filter((a) => padrao.test(codigo(a)));
      expect(culpados.map((c) => path.relative(RAIZ, c))).toEqual([]);
    });
  }
});

// AQUI FICAVA O LEMBRETE DA DÍVIDA DO LEGADO.
//
// Ele afirmava que `saveResult` (em `src/lib/api.ts`) ainda persistia o `AnalysisResult`
// inteiro em `sessionStorage`, e foi escrito para FALHAR no dia em que o legado sumisse —
// com a instrução de ser removido junto, porque lembrete que sobrevive ao seu motivo vira
// ruído.
//
// Esse dia é hoje: o cache de resultado no navegador foi removido. As provas que o
// substituem, mais fortes, estão em `test/v1/storage-legado.test.ts` (ausência no código +
// limpeza das chaves legadas) e em `ui/semStorageDeResultado.test.tsx` (nada é escrito, e o
// refresh reconsulta o Gateway).
