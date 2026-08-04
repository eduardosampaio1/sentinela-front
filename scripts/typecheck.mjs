// GATE OFICIAL DE TYPECHECK — `npm run typecheck`.
//
// Ele faz três coisas numa passada só (cada projeto é compilado UMA vez, com `--listFiles`):
//
//   1. ERROS       — nenhum projeto pode ter erro de tipo.
//   2. EXECUÇÃO    — cada projeto tem de ter processado arquivos. Projeto que checa zero
//                    arquivos sai com código 0 e parece verde; já custou caro aqui.
//   3. COBERTURA   — todo `.ts`/`.tsx` versionado pertence a pelo menos um projeto.
//
// ## Por que o desenho mudou
//
// Até aqui o gate rodava dois projetos ESTRITOS que enumeravam diretórios
// (`canonical-analysis`, `launchpad`, `history`). Enumeração é frágil pelo motivo óbvio —
// alguém esquece de registrar — e pelo não-óbvio: **o gate continua verde enquanto esquece**, e
// verde é indistinguível de coberto.
//
// Aconteceu duas vezes:
//
//   Onda 8   `launchpad` e `history` estavam vivas e fora do alcance. O primeiro `tsc` sobre
//            elas achou dois defeitos REAIS de runtime (`navigate` fora de escopo;
//            `descriptor.label` inexistente).
//   Onda 8+  `features/dashboard` nasceu fora das três. O gate passou limpo sobre 97 arquivos
//            e nunca abriu os 7 dela, que tinham 3 erros de tipo.
//
// A correção não foi acrescentar um quarto diretório à lista — isso repetiria o defeito na
// próxima pasta. Foram criados projetos definidos por EXCLUSÃO (`prod`, `tests`, `e2e`,
// `node`), cuja união é a árvore inteira, mais um gate de cobertura que confere essa união
// contra o índice do git. Arquivo novo nasce coberto.
//
// Os projetos estritos continuam existindo: eles são a régua ALTA sobre a jornada canônica.
// Os de cobertura são o PISO.
//
// ## `npx tsc --noEmit` na raiz não é evidência
//
// `tsconfig.json` tem `"files": []` com project references. Rodá-lo verifica ZERO arquivos e
// sai com código 0 — parece verde e é vazio. Houve uma fatia inteira reportada como "tsc
// limpo" com esse comando; quando o comando certo rodou, apareceram 3 erros, um deles de duas
// fatias antes. O item 4 abaixo pina esse fato: se alguém mudar a raiz, o gate reprova e
// obriga a atualizar a história em vez de deixá-la desatualizada em silêncio.

import { PROJETOS, rodar } from "./typecheck-projetos.mjs";
import { verificarCobertura } from "./typecheck-cobertura.mjs";

/** Piso de sanidade por projeto. Não é meta: é o tamanho abaixo do qual "0 erros" não
 *  significa nada, porque provavelmente nada foi compilado. */
const MIN_ARQUIVOS = 3;

let falhou = false;
const cobertosPor = new Map();

for (const { arquivo, papel, nome } of PROJETOS) {
  const { erros, arquivos } = rodar(arquivo);

  // 2) EXECUÇÃO antes de 1) ERROS: "0 erros" sobre 0 arquivos é a mentira mais barata que um
  //    gate de tipos consegue contar, e ela passa despercebida porque a saída é idêntica à do
  //    sucesso.
  if (arquivos.size < MIN_ARQUIVOS) {
    console.error(
      `[typecheck] ${arquivo} processou ${arquivos.size} arquivo(s) (mínimo ${MIN_ARQUIVOS}).\n` +
        "Um projeto que não compila nada sai limpo. Isto é instrumento quebrado, não aprovação.",
    );
    falhou = true;
    continue;
  }

  if (erros.length) {
    console.error(
      `[typecheck] ${erros.length} erro(s) em ${arquivo} — ${nome}:\n${erros.join("\n")}`,
    );
    falhou = true;
  } else {
    console.log(`[typecheck] OK  ${arquivo.padEnd(24)} ${String(arquivos.size).padStart(4)} arq.  (${papel}) ${nome}`);
  }

  for (const f of arquivos) {
    if (!cobertosPor.has(f)) cobertosPor.set(f, []);
    cobertosPor.get(f).push(arquivo);
  }
}

// 3) COBERTURA — reusa os programas já montados acima; não recompila nada.
if (!verificarCobertura(cobertosPor)) falhou = true;

// 4) A raiz continua não sendo evidência, e isto é VERIFICADO, não prometido num comentário.
const raiz = rodar("tsconfig.json");
if (raiz.arquivos.size !== 0) {
  console.error(
    `[typecheck] tsconfig.json (raiz) passou a processar ${raiz.arquivos.size} arquivo(s) do repo.\n` +
      "Isso pode ser uma melhoria legítima — mas a documentação e este gate afirmam em vários\n" +
      "lugares que `npx tsc --noEmit` na raiz verifica ZERO arquivos. Atualize os dois antes de\n" +
      "seguir: um fato pinado que muda em silêncio é pior que fato nenhum.",
  );
  falhou = true;
}

if (falhou) process.exit(1);

console.log(
  `\n[typecheck] APROVADO — ${PROJETOS.length} projetos, ${cobertosPor.size} arquivos compilados, ` +
    "cobertura completa, raiz inerte.",
);
