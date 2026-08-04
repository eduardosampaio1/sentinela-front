// Teste do INSTRUMENTO: prova que `npm run typecheck` alcança cada superfície viva.
//
// Um gate só protege o que ele lê. Até a Onda 8 o gate oficial cobria apenas
// `features/canonical-analysis`; `features/launchpad` e `features/history` estavam VIVAS e fora
// do alcance — e o primeiro `tsc` sobre elas achou dois defeitos reais de runtime:
//
//   LaunchpadPage    `navigate` usado fora do escopo onde foi declarado → ReferenceError no clique
//   RunComparePanel  `descriptor.label` não existe (é `labelKey`) → painel exibia o id cru
//
// Nenhum dos dois quebrava o gate, porque o gate não olhava ali.
//
// Este script não confere configuração — ele INJETA um erro de tipo em cada superfície e exige
// que `npm run typecheck` REPROVE, depois restaura e exige que volte a passar. Conferir o
// `include` do tsconfig provaria a intenção; injetar prova o efeito.
//
//     node scripts/typecheck-alcance.mjs

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

/** Um arquivo REAL por superfície — injetar em arquivo novo provaria menos: um `include` de
 *  diretório poderia estar certo para o arquivo novo e errado para os que já existem.
 *
 *  As três primeiras são as superfícies ESTRITAS. As demais entraram com a ANL-FE-08, quando o
 *  gate passou a cobrir a árvore inteira — e `features/dashboard` está aqui por ser o diretório
 *  cuja ausência originou a dívida: ele existia, estava vivo, e nenhum projeto o abria. */
const SUPERFICIES = [
  { nome: "features/canonical-analysis", arquivo: "src/features/canonical-analysis/flag.ts" },
  { nome: "features/launchpad", arquivo: "src/features/launchpad/LaunchpadPage.tsx" },
  { nome: "features/history", arquivo: "src/features/history/RunComparePanel.tsx" },
  { nome: "features/dashboard", arquivo: "src/features/dashboard/resolverAnaliseCanonica.ts" },
  { nome: "shell (produção fora de feature)", arquivo: "src/shell/Sidebar.tsx" },
  { nome: "testes de unidade", arquivo: "src/features/dashboard/resolverAnaliseCanonica.test.ts" },
  { nome: "specs de browser", arquivo: "e2e/canonical-route.spec.ts" },
  { nome: "configs de ferramenta", arquivo: "vitest.config.ts" },
];

// Erro de tipo INEQUÍVOCO e sem efeito de runtime: declaração isolada, nunca chamada.
//
// O comentário NÃO pode conter `@ts-` em forma nenhuma. A primeira versão escrevia
// `// @ts-expect-error-NAO — injeção do gate`, achando que o sufixo descaracterizava a
// diretiva. Não descaracteriza: o TypeScript aceita `@ts-expect-error <descrição>`, e `-NAO`
// virou descrição. A injeção suprimia a si mesma, e as TRÊS superfícies "passaram" — inclusive
// a que já estava coberta desde a Onda 6.
//
// Foi o próprio teste do instrumento que denunciou: um resultado 0/3 onde 1/3 era certo é
// implausível, e implausível é o que se investiga.
const VENENO = "\nconst __alcance_do_gate__: number = 'isto nao e um numero';\n";

function typecheck() {
  const r = spawnSync("npm", ["run", "typecheck"], { cwd: RAIZ, encoding: "utf8", shell: true });
  return { ok: r.status === 0, saida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

let falhas = 0;

const base = typecheck();
if (!base.ok) {
  console.error("PRE-CONDICAO FALHOU: o typecheck ja estava vermelho antes da injecao.");
  console.error(base.saida.trim().split("\n").slice(-4).join("\n"));
  process.exit(1);
}
console.log("baseline: typecheck VERDE");

for (const { nome, arquivo } of SUPERFICIES) {
  const caminho = resolve(RAIZ, arquivo);
  const original = readFileSync(caminho, "utf8");
  let reprovou = false;
  let citou = false;
  try {
    writeFileSync(caminho, original + VENENO);
    const r = typecheck();
    reprovou = !r.ok;
    // Não basta reprovar: tem de reprovar POR ESTE arquivo. Um gate que reprova por outro
    // motivo passaria neste teste sem alcançar a superfície.
    citou = r.saida.includes(arquivo.split("/").pop());
  } finally {
    writeFileSync(caminho, original);
  }

  const bom = reprovou && citou;
  console.log(`${bom ? "OK    " : "FALHOU"}  ${nome} — erro injetado ${reprovou ? "reprova" : "NAO reprova"}${reprovou && !citou ? ", mas o relatorio nao cita o arquivo" : ""}`);
  if (!bom) falhas += 1;
}

// ── COBERTURA: um arquivo ORFAO tem de reprovar, e reprovar POR COBERTURA ────────────────
//
// As injecoes acima provam que o gate ALCANCA cada superficie conhecida. Esta prova outra
// coisa, e e a que faltava: que ele PERCEBE uma superficie que ninguem registrou. Sem ela, o
// gate voltaria a ficar verde no dia em que aparecesse a proxima `features/dashboard`.
//
// O arquivo e sintaticamente valido e sem erro de tipo DE PROPOSITO: se ele tivesse erro, a
// reprovacao poderia vir do typecheck e nao da cobertura, e o teste passaria pelo motivo
// errado. So a mensagem de cobertura discrimina.
{
  const dir = resolve(RAIZ, "ferramentas-orfas");
  const arquivo = resolve(dir, "orfao.ts");
  const rel = "ferramentas-orfas/orfao.ts";
  let reprovou = false;
  let porCobertura = false;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(arquivo, "export const orfao = 1;\n");
    // `git add -N`: entra no indice (o inventario e `git ls-files`) sem virar conteudo
    // versionado. Sem isto o gate nem enxergaria o arquivo, e o teste passaria vazio.
    spawnSync("git", ["add", "-N", rel], { cwd: RAIZ, encoding: "utf8", shell: true });
    const r = typecheck();
    reprovou = !r.ok;
    porCobertura = r.saida.includes("[cobertura] REPROVADO") && r.saida.includes(rel);
  } finally {
    spawnSync("git", ["rm", "-q", "--cached", rel], { cwd: RAIZ, encoding: "utf8", shell: true });
    rmSync(dir, { recursive: true, force: true });
  }
  const bom = reprovou && porCobertura;
  console.log(
    `${bom ? "OK    " : "FALHOU"}  cobertura — arquivo orfao ${reprovou ? "reprova" : "NAO reprova"}` +
      `${reprovou && !porCobertura ? ", mas nao pela verificacao de cobertura" : ""}`,
  );
  if (!bom) falhas += 1;
}

const depois = typecheck();
console.log(`${depois.ok ? "OK    " : "FALHOU"}  restauracao — typecheck volta a passar`);
if (!depois.ok) falhas += 1;

if (falhas) {
  console.error(`\nREPROVADO: ${falhas} superficie(s) fora do alcance do gate oficial.`);
  process.exit(1);
}
console.log(
  `\nAPROVADO — ${SUPERFICIES.length}/${SUPERFICIES.length} superficies vivas alcancadas pelo ` +
    "`npm run typecheck`, e arquivo fora de todos os projetos reprovado POR COBERTURA.",
);
