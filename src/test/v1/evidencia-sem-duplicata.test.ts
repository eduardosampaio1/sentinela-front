// M45.6 — a EVIDÊNCIA não pode ter duas cópias com nomes diferentes.
//
// ## O defeito que este gate existe para impedir
//
// `docs/inst05` tinha `desktop-com-referencia.png` e `desktop-en-com-referencia.png` **byte a
// byte idênticas**, e o mesmo par para `sem-referencia`. Dois arquivos, dois nomes, uma prova só.
//
// A causa foi uma letra: a spec escrevia `sentinela.language` (ponto) e a chave real é
// `sentinela:language` (dois-pontos). Nada era gravado, o idioma ficava no padrão — que é `en` —,
// e as capturas que anunciavam `en` saíam iguais às que não anunciavam nada. Duas imagens
// prometendo provar idiomas diferentes provavam o mesmo.
//
// ## Por que um gate de arquivo, e não de spec
//
// A M42 já tinha vivido isto por outro caminho (duas chamadas ao provador sobre o mesmo estado), e
// a M45.4 por um terceiro (specs de captura sem asserção). São causas distintas com o MESMO
// sintoma observável: dois arquivos idênticos no diretório de evidência. Medir o sintoma pega as
// três, e pega a quarta que ninguém previu.
//
// Duplicata NÃO é desperdício de disco: é um leitor concluindo que dois estados foram provados
// quando um deles nunca foi renderizado.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const DOCS = resolve(RAIZ, "docs");

/** Todo `.png` sob `docs/`, em qualquer profundidade. */
function capturas(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...capturas(caminho));
    else if (nome.toLowerCase().endsWith(".png")) saida.push(caminho);
  }
  return saida;
}

describe("M45.6 · a evidência versionada não tem cópias", () => {
  const arquivos = capturas(DOCS);

  it("há capturas para medir — laço vazio é sempre verde", () => {
    // O piso do INSTRUMENTO. Sem ele, apagar `docs/` inteiro deixaria este gate verde.
    expect(arquivos.length, "nenhuma captura encontrada em docs/").toBeGreaterThan(40);
  });

  it("nenhuma imagem é byte a byte igual a outra", () => {
    const porDigest = new Map<string, string[]>();
    for (const caminho of arquivos) {
      const digest = createHash("sha256").update(readFileSync(caminho)).digest("hex");
      const rel = caminho.replace(RAIZ, "").replace(/\\/g, "/");
      porDigest.set(digest, [...(porDigest.get(digest) ?? []), rel]);
    }

    const duplicadas = [...porDigest.values()]
      .filter((grupo) => grupo.length > 1)
      .map((grupo) => grupo.sort().join(" == "));

    expect(
      duplicadas,
      "duas capturas com o mesmo conteúdo e nomes diferentes: uma delas documenta um estado que " +
        "nunca foi renderizado",
    ).toEqual([]);
  });
});
