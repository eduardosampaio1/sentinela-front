// Gate do BUNDLE: nenhum símbolo do cache de resultado sobrevive ao build.
//
// Uso: `npm run build -- --sourcemap && node scripts/gate-bundle-sem-cache.mjs`
//
// ## Por que sourcemap e não o .js minificado
//
// O bundle minificado renomeia identificadores locais. Procurar `saveResult` nele é procurar
// um nome que o minificador já apagou: o gate passa verde e não prova nada. O `sourcesContent`
// do sourcemap carrega o código ORIGINAL de cada módulo que entrou no build — é ali que a
// pergunta "este código foi empacotado?" tem resposta.
//
// ## Por que comentários são removidos antes da busca
//
// `lib/api.ts` explica, num comentário, o que foi removido e por quê — e para isso NOMEIA os
// símbolos. Um gate que lesse o comentário reprovaria justamente o arquivo que documenta a
// correção. Ele mediria a prosa, não o programa.
//
// ## Por que falha (e não pula) sem `dist/`
//
// Um gate que se silencia quando o alvo não existe reporta verde por ausência de trabalho. Se
// não há build, a resposta honesta é "não sei" — e "não sei" é falha.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist/assets");

/** Símbolos que compunham o cache de resultado no navegador. */
const PROIBIDOS = [
  "saveResult",
  "loadResult",
  "loadLastResult",
  "isSessionCached",
  "cacheKeyFor",
  "workspaceScopedLastKey",
  "hashDataset",
];

function semComentarios(fonte) {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

if (!existsSync(DIST)) {
  console.error(`FALHA: ${DIST} não existe. Rode o build com --sourcemap antes do gate.`);
  process.exit(1);
}

const mapas = readdirSync(DIST).filter((f) => f.endsWith(".js.map"));
if (mapas.length === 0) {
  console.error("FALHA: nenhum .js.map em dist/assets. O build precisa de --sourcemap.");
  process.exit(1);
}

const achados = [];
let modulosLidos = 0;

for (const mapa of mapas) {
  const conteudo = JSON.parse(readFileSync(path.join(DIST, mapa), "utf-8"));
  const fontes = conteudo.sources ?? [];
  const originais = conteudo.sourcesContent ?? [];
  for (let i = 0; i < fontes.length; i += 1) {
    const original = originais[i];
    if (typeof original !== "string") continue;
    modulosLidos += 1;
    const codigo = semComentarios(original);
    for (const simbolo of PROIBIDOS) {
      if (new RegExp(`\\b${simbolo}\\b`).test(codigo)) {
        achados.push(`${mapa} :: ${fontes[i]} :: ${simbolo}`);
      }
    }
  }
}

// Guarda contra o gate vazio: se nenhum módulo foi lido, a ausência acima não significa nada.
if (modulosLidos < 50) {
  console.error(`FALHA: só ${modulosLidos} módulos lidos dos sourcemaps — o gate não inspecionou o bundle.`);
  process.exit(1);
}

if (achados.length > 0) {
  console.error("FALHA: símbolos do cache de resultado presentes no bundle:");
  for (const a of achados) console.error(`  ${a}`);
  process.exit(1);
}

console.log(`OK: ${modulosLidos} módulos inspecionados em ${mapas.length} sourcemaps; 0 símbolos do cache.`);
