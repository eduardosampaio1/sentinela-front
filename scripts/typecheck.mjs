// Gate de typecheck ESTRITO da jornada canônica (Onda 6). Duas camadas:
//   1) tsconfig.v1.json  — lógica pura (lib/v1 + data + flag + testes): deve ficar 100% limpa.
//   2) tsconfig.v1-ui.json — UI canônica (importa shell/auth legado): FALHA em qualquer erro em
//      `features/canonical-analysis/**`; tolera SÓ os erros legados pré-existentes do grafo
//      importado (não tocamos o legado — restrição da Onda 6). Ver docs/onda6/E1-typecheck-gate.md.

import { spawnSync } from "node:child_process";

function tsc(project) {
  const r = spawnSync("npx", ["tsc", "-p", project, "--noEmit"], { encoding: "utf8", shell: true });
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
}
// Normaliza `\` → `/` (o tsc no Windows pode emitir caminhos com barra invertida) para o filtro
// de arquivo NÃO deixar um erro da UI canônica passar como "legado" (Codex E2 R3).
const errLines = (out) =>
  out
    .split(/\r?\n/)
    .filter((l) => /error TS\d+/.test(l))
    .map((l) => l.replace(/\\/g, "/"));

// 1) Pura: qualquer erro reprova.
const pure = errLines(tsc("tsconfig.v1.json"));
if (pure.length) {
  console.error(`[typecheck] ${pure.length} erro(s) na camada canônica PURA:\n${pure.join("\n")}`);
  process.exit(1);
}

// 2) UI: reprova erros DENTRO da jornada canônica E impõe o allowlist legado (Codex E2 R4):
//    o baseline legado do grafo importado é EXATAMENTE este — não pode crescer nem mudar em
//    silêncio (novo import legado com erro, ou os 3 virando 4, reprova). Ver E1-typecheck-gate.md.
// 3 -> 1 (Onda 8, macrofrente de identidade). Os dois que sairam eram de `lib/workspaces`,
// que deixou o grafo quando o AuthContext parou de ler membership do Supabase e a
// WorkspacesPage passou a listar a projecao de /v1/me.
//
// 1 -> 0 (aposentadoria do dashboard legado). O ultimo saiu junto com a ilha legada inteira:
// `lib/api.ts`, `adapters/*`, `domain/*` e `lib/reportPdf.ts` perderam o unico consumidor
// (a `DashboardPage`) e foram removidos. Nao houve conserto — houve remocao do subject.
//
// Baseline SO DESCE. Zero e o piso: dai em diante, qualquer erro legado e um erro NOVO.
const EXPECTED_LEGACY = 0;
const uiAll = errLines(tsc("tsconfig.v1-ui.json"));
// SUPERFICIES VIVAS — qualquer erro AQUI reprova, sem allowlist.
//
// `canonical-analysis` era a unica ate a Onda 8. `launchpad` e `history` entraram porque
// estavam VIVAS e fora do alcance do gate: o primeiro `tsc` sobre elas achou dois defeitos
// reais de runtime (`navigate` fora de escopo, `descriptor.label` inexistente). Um gate que
// nao alcanca a tela nao protege a tela.
//
// A lista e de PREFIXO DE DIRETORIO, casada com o `include` do `tsconfig.v1-ui.json`: os
// dois precisam crescer juntos, e o teste do instrumento afirma isso.
export const SUPERFICIES_ESTRITAS = [
  "features/canonical-analysis",
  "features/launchpad",
  "features/history",
];

const estrito = (l) => SUPERFICIES_ESTRITAS.some((s) => l.includes(s));
const canonical = uiAll.filter(estrito);
const legacy = uiAll.filter((l) => !estrito(l));
if (canonical.length) {
  console.error(`[typecheck] ${canonical.length} erro(s) ESTRITO(s) nas superfícies vivas:\n${canonical.join("\n")}`);
  process.exit(1);
}
if (legacy.length !== EXPECTED_LEGACY) {
  console.error(
    `[typecheck] baseline legado mudou: esperado ${EXPECTED_LEGACY}, encontrado ${legacy.length}.\n` +
      `${legacy.join("\n")}\n` +
      `Se a mudança é legítima, atualize EXPECTED_LEGACY em scripts/typecheck.mjs e docs/onda6/E1-typecheck-gate.md.`,
  );
  process.exit(1);
}

console.log(
  `[typecheck] OK — canônico PURO e UI estritos e limpos; ${legacy.length}/${EXPECTED_LEGACY} erro(s) ` +
    `legado(s) do grafo importado (allowlist congelado, não cresce).`,
);
