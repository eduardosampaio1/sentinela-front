// M03 — gate de ARQUIVO CSS ÓRFÃO.
//
// Por que ele existe, e por que não é higiene decorativa:
//
// `src/index.css` e `src/App.css` viveram na árvore sem serem importados por ninguém. Isso já é
// peso morto, e seria só isso se o conteúdo fosse inerte — mas não era: `index.css` declarava
// `--background`, `--primary` e companhia com valores DIFERENTES dos que `styles/globals.css`
// declara, e guardava a ÚNICA regra `.dark` do repositório.
//
// O resultado é a pior categoria de defeito: inerte hoje, e armado. Bastava alguém importar o
// arquivo — ou rodar o CLI do shadcn, que `components.json` apontava para ele — para a colisão
// acordar e dois vocabulários de token passarem a brigar em tempo de execução, sem nenhum teste
// reagindo. Um `.dark` fantasma num arquivo morto também é o tipo de coisa que faz alguém concluir
// que "o suporte a tema existe", quando ele nunca foi carregado.
//
// O gate não julga conteúdo. Ele exige que todo CSS versionado em `src/` tenha um CONSUMIDOR.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");

/** Pastas que não participam do bundle e não podem "consumir" nada em produção. */
const IGNORADAS = new Set(["node_modules", "dist", "coverage"]);

function arquivos(dir: string, filtro: (p: string) => boolean, acc: string[] = []): string[] {
  for (const entrada of readdirSync(dir)) {
    if (IGNORADAS.has(entrada)) continue;
    const caminho = resolve(dir, entrada);
    if (statSync(caminho).isDirectory()) arquivos(caminho, filtro, acc);
    else if (filtro(caminho)) acc.push(caminho);
  }
  return acc;
}

/** Barra normal sempre — no Windows o separador é `\` e a comparação textual falharia calada. */
const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

describe("M03 · nenhum arquivo CSS órfão em src/", () => {
  it("todo CSS versionado tem pelo menos um consumidor", () => {
    const css = arquivos(SRC, (p) => extname(p) === ".css");
    // Sem isto, uma árvore sem CSS nenhum passaria — verde por não verificar nada é o defeito
    // que esta casa já pagou várias vezes.
    expect(css.length, "nenhum arquivo .css encontrado em src/").toBeGreaterThan(0);

    // Consumidores possíveis: qualquer código do repo, mais o HTML de entrada e a config do
    // shadcn (que aponta o CSS onde os tokens moram e é usada pelo CLI, não pelo build).
    const fontes = [
      ...arquivos(SRC, (p) => [".ts", ".tsx", ".js", ".jsx", ".css"].includes(extname(p))),
      resolve(RAIZ, "index.html"),
      resolve(RAIZ, "components.json"),
    ];

    const orfaos: string[] = [];
    for (const arquivo of css) {
      const nome = arquivo.split(/[\\/]/).pop()!;
      const referenciado = fontes.some((f) => {
        if (f === arquivo) return false; // não conta como consumidor de si mesmo
        try {
          return readFileSync(f, "utf-8").includes(nome);
        } catch {
          return false;
        }
      });
      if (!referenciado) orfaos.push(posix(arquivo));
    }

    expect(
      orfaos,
      "CSS versionado sem consumidor. Arquivo morto que declara token é defeito armado: " +
        "inerte até alguém importá-lo, e então dois vocabulários brigam sem teste reagir.",
    ).toEqual([]);
  });

  it("os dois arquivos que motivaram este gate não voltaram", () => {
    // Âncora nominal. O caso acima já os pegaria, mas nomeá-los deixa a regressão legível para
    // quem ler a falha daqui a seis meses sem o contexto da M03.
    const css = arquivos(SRC, (p) => extname(p) === ".css").map(posix);
    expect(css).not.toContain("src/index.css");
    expect(css).not.toContain("src/App.css");
  });
});
