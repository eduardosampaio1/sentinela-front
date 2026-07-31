// CADEADO de bundle (Onda 6 E3 reconciliação, item 1).
//
// Prova que o bypass de auth E2E é IMPOSSÍVEL de ativar num build de produção: o módulo
// dev-only `src/e2e/bypass.ts` (que contém a sessão/token fixos) é eliminado do bundle porque
// só é `import()`-ado sob `import.meta.env.DEV` (literal `false` em produção). Falha o gate se
// qualquer marcador do bypass aparecer no `dist/`.
//
// Uso: node scripts/verify-e2e-lockdown.mjs   (assume `vite build` já rodado em dist/)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";

// Marcadores que NÃO podem existir no bundle de produção.
const FORBIDDEN = [
  "e2e-local-session-not-a-real-credential", // token/sessão fixos do bypass
  "__SENTINELA_E2E_BYPASS__", // chave global do bridge (só usada sob DEV)
  "installE2EBypass", // entrada do módulo dev-only
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`[cadeado-e2e] ERRO: '${DIST}/' não existe. Rode 'npx vite build' antes.`);
  process.exit(2);
}

const textFiles = files.filter((f) => /\.(js|mjs|cjs|css|html|map)$/.test(f));
const hits = [];
for (const f of textFiles) {
  const content = readFileSync(f, "utf8");
  for (const marker of FORBIDDEN) {
    if (content.includes(marker)) hits.push({ file: f, marker });
  }
}

if (hits.length > 0) {
  console.error("[cadeado-e2e] FALHOU — marcadores do bypass E2E vazaram para o bundle de produção:");
  for (const h of hits) console.error(`  • ${h.marker}  em  ${h.file}`);
  console.error("O bypass DEVE ser eliminado por dead-code (import.meta.env.DEV === false).");
  process.exit(1);
}

console.log(
  `[cadeado-e2e] OK — nenhum marcador do bypass E2E no bundle (${textFiles.length} arquivos varridos). ` +
    "Token fixo ausente; bypass impossível de ativar em produção.",
);
