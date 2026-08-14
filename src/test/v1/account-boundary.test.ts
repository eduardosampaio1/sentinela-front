// G-R8 — o Front NUNCA vê o segredo interno do Account.
//
// ## Por que isto é gate e não confiança
//
// A `BD11` pôs o `sentinela-account` atrás de uma credencial que só o Gateway apresenta
// (`x-internal-token`). O caminho é `Gateway → Account`, e o Front fala **apenas** com o Gateway,
// por `/v1/me/language`, autenticado como usuário.
//
// O jeito de isso dar errado não é alguém decidir vazar o segredo — é a M41 chegar, alguém não
// achar a rota pública na hora, e "temporariamente" apontar o Front para o Account direto com o
// token numa `VITE_`. Toda variável `VITE_` **vai para o bundle**: ela é pública por construção,
// e o navegador de qualquer usuário a lê.
//
// Este arquivo existe antes da M41 de propósito. Gate escrito depois do atalho chega tarde.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const FONTE = join(RAIZ, "src");

/** Nomes que só existem do lado servidor. Nenhum pode aparecer no código do navegador. */
const NUNCA_NO_FRONT = [
  "SENTINELA_ACCOUNT_INTERNAL_TOKEN",
  "ACCOUNT_INTERNAL_TOKEN",
  "ACCOUNT_DATABASE_URL",
  "x-internal-token",
  "/internal/v1/accounts",
] as const;

/**
 * Os arquivos cuja FUNÇÃO é declarar a proibição saem da varredura. Só eles, e nomeados.
 *
 * Eles citam os símbolos proibidos por ofício. Na primeira execução o gate acusou a si mesmo, que
 * é o modo clássico de errar ao escrever cadeado textual: quem se comporta bem é denunciado, e a
 * saída fácil vira apagar a declaração.
 *
 * **Excluir a pasta de testes inteira seria demais** — um teste que vazasse o segredo continuaria
 * vazando, e vale exatamente o mesmo se estiver num `.test.ts`. Por isso a lista é de CAMINHOS, e
 * cresce só quando alguém escreve, de propósito, mais um gate que precisa nomear o proibido.
 *
 * Quem entrou aqui, e por quê:
 *
 * - este arquivo — é a sede da declaração;
 * - `m41-massas-conta.test.ts` — o gate G17 dele afirma que o mock público NÃO conhece a API
 *   interna do Account, e para afirmar isso precisa escrever os nomes.
 */
const DECLARAM_A_PROIBICAO = new Set(
  [__filename, join(__dirname, "m41-massas-conta.test.ts")].map((c) => resolve(c)),
);

function arquivosDeFonte(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "node_modules" || nome === "__pycache__") continue;
      arquivosDeFonte(caminho, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(nome) && !DECLARAM_A_PROIBICAO.has(resolve(caminho))) {
      acc.push(caminho);
    }
  }
  return acc;
}

/** Sem docstring nem comentário: este arquivo cita os proibidos por ofício, e ele está em `src`. */
function soCodigo(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("G-R8 · a fronteira do Account não alcança o navegador", () => {
  const arquivos = arquivosDeFonte(FONTE);

  it("a varredura encontra código", () => {
    // Piso: sem ele, um caminho errado faria tudo passar sobre lista vazia.
    expect(arquivos.length).toBeGreaterThan(100);
  });

  it("nenhum nome de credencial ou rota interna do Account aparece na fonte", () => {
    const infratores: string[] = [];
    for (const caminho of arquivos) {
      const codigo = soCodigo(readFileSync(caminho, "utf8"));
      for (const proibido of NUNCA_NO_FRONT) {
        if (codigo.includes(proibido)) {
          infratores.push(`${caminho.slice(RAIZ.length + 1)}: ${proibido}`);
        }
      }
    }
    expect(
      infratores,
      "o Front alcançou a fronteira INTERNA do Account. Ele fala com o Gateway, e só:\n" +
        "  GET/PUT /v1/me/language, autenticado como usuário.",
    ).toEqual([]);
  });

  it("o detector pegaria o vazamento — provado, não presumido", () => {
    // Sem esta contraprova, um `soCodigo` que apagasse o arquivo inteiro faria o caso acima
    // passar para sempre.
    const vazamento = `const t = import.meta.env.VITE_SENTINELA_ACCOUNT_INTERNAL_TOKEN;`;
    expect(NUNCA_NO_FRONT.some((p) => soCodigo(vazamento).includes(p))).toBe(true);
  });

  it("o Front não conhece nenhuma variável `VITE_` de Account", () => {
    // `VITE_*` vai para o bundle. Uma variável de Account aqui seria pública por construção.
    const comVite: string[] = [];
    for (const caminho of arquivos) {
      const codigo = soCodigo(readFileSync(caminho, "utf8"));
      for (const achado of codigo.match(/VITE_[A-Z0-9_]*ACCOUNT[A-Z0-9_]*/g) ?? []) {
        comVite.push(`${caminho.slice(RAIZ.length + 1)}: ${achado}`);
      }
    }
    expect(comVite).toEqual([]);
  });
});
