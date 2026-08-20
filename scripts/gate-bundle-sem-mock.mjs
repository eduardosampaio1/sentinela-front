// Gate do BUNDLE: nenhum vestígio de mock sobrevive ao build.
//
// Uso: `npm run build -- --sourcemap && node scripts/gate-bundle-sem-mock.mjs`
//
// ## As duas perguntas, e por que elas precisam de instrumentos diferentes
//
//   1. **O ARQUIVO do service worker foi copiado?** `public/` é copiado verbatim, então isto se
//      responde olhando o disco. É a pergunta fácil, e era a que estava passando.
//   2. **O CÓDIGO do mock foi empacotado?** Esta não se responde procurando `msw` no `.js`
//      minificado: o minificador já renomeou os identificadores locais, e a busca passa verde sem
//      ter olhado nada. É a mesma lição que `gate-bundle-sem-cache.mjs` escreveu antes — e ela
//      custou uma medição errada nesta casa antes de virar regra.
//
//      A resposta está no `sourcesContent` do sourcemap: ele carrega o código ORIGINAL de cada
//      módulo que entrou no build. Ali "este arquivo foi empacotado?" tem resposta.
//
// ## Por que comentários são removidos antes da busca
//
// `mocks/browser.ts` explica, em prosa, como o cadeado do mock funciona — e para isso NOMEIA
// `setupWorker` e `msw`. Um gate que lesse o comentário reprovaria justamente o arquivo que
// documenta a correção. Ele mediria a prosa, não o programa.
//
// ## Por que falha (e não pula) sem `dist/`
//
// Um gate que se silencia quando o alvo não existe reporta verde por ausência de trabalho — e
// "não achei mock" ficaria indistinguível de "não procurei".

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(RAIZ, "dist");
const ASSETS = join(DIST, "assets");

/** Arquivos estáticos que não podem ser publicados. */
const ARQUIVOS_PROIBIDOS = ["mockServiceWorker.js"];

/** Código que não pode ter sido empacotado. Cada um com o nome do que ele denuncia. */
const PROIBIDOS = [
  ["biblioteca msw", /from\s+["'`]msw|require\(["'`]msw/],
  ["setupWorker/setupServer", /\bsetup(Worker|Server)\s*\(/],
  ["handlers de rota falsa", /\bhttp\.(get|post|put|patch|delete)\s*\(/],
  ["import de src/test", /from\s+["'`][^"'`]*(?:\/|@\/)test\//],
  ["import de src/mocks", /from\s+["'`][^"'`]*(?:\/|@\/)mocks\//],
  ["import de src/e2e", /from\s+["'`][^"'`]*(?:\/|@\/)e2e\//],
];

function semComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const falhas = [];

// ── 1. o disco ────────────────────────────────────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error("[gate-bundle-sem-mock] FALHA: `dist/` não existe. Rode o build antes.");
  process.exit(1);
}
for (const f of ARQUIVOS_PROIBIDOS) {
  if (existsSync(join(DIST, f))) falhas.push(`arquivo estático publicado: dist/${f}`);
}

// ── 2. o sourcemap ────────────────────────────────────────────────────────────────────────
const mapas = existsSync(ASSETS)
  ? readdirSync(ASSETS).filter((f) => f.endsWith(".map"))
  : [];

if (mapas.length === 0) {
  console.error(
    "[gate-bundle-sem-mock] FALHA: nenhum sourcemap em dist/assets. Rode `npm run build -- --sourcemap`.\n" +
      "  Sem sourcemap este gate só saberia responder metade da pergunta, e responder metade em silêncio é pior que não responder.",
  );
  process.exit(1);
}

let modulos = 0;
for (const m of mapas) {
  const mapa = JSON.parse(readFileSync(join(ASSETS, m), "utf8"));
  const fontes = mapa.sources ?? [];
  const conteudos = mapa.sourcesContent ?? [];
  for (let i = 0; i < conteudos.length; i++) {
    const txt = conteudos[i];
    if (typeof txt !== "string") continue;
    modulos++;
    const limpo = semComentarios(txt);
    for (const [nome, rx] of PROIBIDOS) {
      if (rx.test(limpo)) falhas.push(`${nome} empacotado em ${fontes[i]}`);
    }
  }
}

if (modulos === 0) {
  console.error("[gate-bundle-sem-mock] FALHA: os sourcemaps não trazem `sourcesContent`. Nada foi conferido.");
  process.exit(1);
}

if (falhas.length > 0) {
  console.error(`[gate-bundle-sem-mock] FALHA — ${falhas.length} vestígio(s) de mock no build:`);
  for (const f of [...new Set(falhas)]) console.error(`  · ${f}`);
  process.exit(1);
}

console.log(
  `[gate-bundle-sem-mock] APROVADO — ${modulos} módulos empacotados conferidos, ` +
    `${ARQUIVOS_PROIBIDOS.length} arquivo(s) estático(s) ausente(s) do dist.`,
);
