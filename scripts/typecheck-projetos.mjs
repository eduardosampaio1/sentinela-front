// A lista de projetos de typecheck, em UM lugar só.
//
// Ela é importada pelo gate oficial (`typecheck.mjs`) e pelo gate de cobertura
// (`typecheck-cobertura.mjs`). Duas listas separadas divergiriam, e divergiriam do jeito pior:
// o gate de cobertura afirmaria que tudo está coberto por um projeto que o gate oficial não
// roda.

import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

export const RAIZ = resolve(import.meta.dirname, "..");

/** Os projetos, e o papel de cada um.
 *
 *  Há duas famílias, e a diferença entre elas é o que torna o conjunto honesto:
 *
 *  - **cobertura** (`prod`, `tests`, `e2e`, `node`) — definidos por EXCLUSÃO. Juntos precisam
 *    conter todo `.ts`/`.tsx` versionado, e é isso que o gate de cobertura verifica. Arquivo
 *    novo nasce dentro de um deles sem ninguém registrar nada.
 *
 *  - **rigor** (`v1`, `v1-ui`) — definidos por ENUMERAÇÃO, e estritos. Enumerar aqui é
 *    aceitável porque eles não são a rede de segurança: são a régua alta sobre a jornada
 *    canônica. Se alguém esquecer de registrar um diretório neles, o arquivo continua coberto
 *    pelos de cima — apenas com régua menor, o que é uma perda mensurável, e não um buraco.
 *
 *  Era exatamente o buraco que existia antes: só havia a família do rigor.
 */
export const PROJETOS = [
  { arquivo: "tsconfig.v1.json", papel: "rigor", nome: "canônico puro (estrito)" },
  { arquivo: "tsconfig.v1-ui.json", papel: "rigor", nome: "UI canônica (estrito)" },
  { arquivo: "tsconfig.prod.json", papel: "cobertura", nome: "produção (árvore inteira)" },
  { arquivo: "tsconfig.tests.json", papel: "cobertura", nome: "testes de unidade/componente" },
  { arquivo: "tsconfig.e2e.json", papel: "cobertura", nome: "specs de browser (Playwright)" },
  { arquivo: "tsconfig.node.json", papel: "cobertura", nome: "configs de ferramenta" },
];

/** Roda um projeto UMA vez e devolve erros + o programa REAL que o `tsc` montou.
 *
 *  `--listFiles` é a única fonte honesta de "o que foi checado": ler o `include` do tsconfig
 *  provaria a intenção, e a intenção é justamente o que estava certo enquanto o efeito estava
 *  errado. */
export function rodar(projeto) {
  const r = spawnSync("npx", ["tsc", "-p", projeto, "--noEmit", "--listFiles"], {
    cwd: RAIZ,
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const saida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const linhas = saida.split(/\r?\n/);

  // Normaliza `\` → `/`: no Windows o `tsc` mistura as duas barras, e um filtro por caminho
  // deixaria erro da UI canônica passar como legado (achado do Codex na E2).
  const erros = linhas.filter((l) => /error TS\d+/.test(l)).map((l) => l.replace(/\\/g, "/"));

  const arquivos = new Set();
  for (const linha of linhas) {
    const bruto = linha.trim().replace(/\\/g, "/");
    if (!bruto || !/\.(ts|tsx|d\.ts)$/.test(bruto)) continue;
    if (bruto.includes("/node_modules/")) continue;
    const rel = relative(RAIZ, bruto).replace(/\\/g, "/");
    if (rel && !rel.startsWith("..")) arquivos.add(rel.toLowerCase());
  }
  return { erros, arquivos };
}
