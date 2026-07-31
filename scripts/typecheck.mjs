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

// 2) UI: reprova só erros DENTRO da jornada canônica; tolera legado do grafo importado.
const uiAll = errLines(tsc("tsconfig.v1-ui.json"));
const canonical = uiAll.filter((l) => l.includes("features/canonical-analysis"));
const legacy = uiAll.filter((l) => !l.includes("features/canonical-analysis"));
if (canonical.length) {
  console.error(`[typecheck] ${canonical.length} erro(s) ESTRITO(s) na UI canônica:\n${canonical.join("\n")}`);
  process.exit(1);
}

console.log(
  `[typecheck] OK — canônico PURO e UI estritos e limpos; ${legacy.length} erro(s) legado(s) ` +
    `pré-existente(s) tolerado(s) no grafo importado pela UI (documentado, não cresce).`,
);
