// Gate de COBERTURA: todo `.ts`/`.tsx` versionado pertence a pelo menos um projeto de
// typecheck.
//
//     node scripts/typecheck-cobertura.mjs     # avulso
//
// O `npm run typecheck` já executa esta verificação — ele monta os programas uma vez só e
// reaproveita a mesma medição. Este arquivo continua executável sozinho porque um gate que só
// roda dentro de outro é difícil de depurar quando reprova.
//
// ## O defeito que ele fecha
//
// `src/features/dashboard/` nasceu na aposentadoria do dashboard legado e não entrou em
// projeto nenhum que o `npm run typecheck` rodasse. O gate ficou verde sobre 97 arquivos e
// nunca abriu os 7 dela — que tinham 3 erros de tipo (`TS2493`: indexação de tupla vazia).
//
// A lição não é "faltou registrar o diretório". É que **um gate que enumera não sabe o que
// ficou de fora** — não tem como saber, porque a lista dele *é* a definição do universo. Só um
// inventário INDEPENDENTE (aqui: o índice do git) pode acusar a ausência.
//
// ## O oráculo é o programa, não o tsconfig
//
// A cobertura é medida por `tsc --listFiles`, que diz quais arquivos o compilador REALMENTE
// carregou. Ler o `include` mediria a intenção — e a intenção estava certa o tempo todo; o que
// estava errado era o efeito.
//
// ## Vacuidade
//
// Um gate de cobertura tem uma forma fácil de mentir: com inventário vazio, todo arquivo dele
// está coberto e o gate passa dizendo 0/0. Daí os pisos explícitos — abaixo deles o resultado
// é inacreditável, e inacreditável se trata como instrumento quebrado, não como aprovação.

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { PROJETOS, RAIZ, rodar } from "./typecheck-projetos.mjs";

const MIN_INVENTARIO = 100;
const MIN_COBERTOS = 100;

/** O inventário independente: o que o git conhece. */
export function inventario() {
  const r = spawnSync("git", ["ls-files", "*.ts", "*.tsx"], {
    cwd: RAIZ,
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    console.error("[cobertura] `git ls-files` falhou — sem inventário não há verificação.");
    process.exit(1);
  }
  return r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

/** Verifica a cobertura a partir de programas JÁ montados.
 *
 *  @param cobertosPor Map de arquivo (minúsculo, relativo) → projetos que o carregaram.
 *  @returns `true` se aprovado; imprime e devolve `false` se reprovado.
 */
export function verificarCobertura(cobertosPor) {
  const arquivos = inventario();

  if (arquivos.length < MIN_INVENTARIO) {
    console.error(
      `[cobertura] inventário com ${arquivos.length} arquivos (mínimo ${MIN_INVENTARIO}).\n` +
        "Inventário curto demais torna qualquer aprovação vazia. Instrumento quebrado.",
    );
    return false;
  }
  if (cobertosPor.size < MIN_COBERTOS) {
    console.error(
      `[cobertura] só ${cobertosPor.size} arquivo(s) cobertos (mínimo ${MIN_COBERTOS}).\n` +
        "Provavelmente nenhum projeto compilou. Instrumento quebrado, não aprovação.",
    );
    return false;
  }

  const orfaos = arquivos.filter((f) => !cobertosPor.has(f.toLowerCase()));
  if (orfaos.length) {
    console.error(
      `\n[cobertura] REPROVADO — ${orfaos.length} arquivo(s) fora de TODO projeto de typecheck:\n` +
        orfaos.map((f) => `  ${f}`).join("\n") +
        "\n\nNenhum comando do `npm run typecheck` abre esses arquivos. Coloque-os num projeto " +
        "— preferir ampliar um `include`/`exclude` existente a criar allowlist nova.",
    );
    return false;
  }

  const porProjeto = new Map();
  for (const projetos of cobertosPor.values()) {
    for (const p of projetos) porProjeto.set(p, (porProjeto.get(p) ?? 0) + 1);
  }
  console.log(
    `[cobertura] OK — ${arquivos.length}/${arquivos.length} arquivos versionados cobertos por ` +
      `${PROJETOS.length} projetos:`,
  );
  for (const { arquivo, papel } of PROJETOS) {
    const n = String(porProjeto.get(arquivo) ?? 0).padStart(4);
    console.log(`  ${arquivo.padEnd(24)} ${n}  (${papel})`);
  }
  return true;
}

/** Monta os programas do zero. Só o caminho avulso precisa disto; o gate oficial reaproveita
 *  os programas que ele já montou para checar erros. */
export function coletarProgramas() {
  const cobertosPor = new Map();
  for (const { arquivo } of PROJETOS) {
    const { arquivos } = rodar(arquivo);
    console.log(`[cobertura] ${arquivo}: ${arquivos.size} arquivo(s) no programa`);
    for (const f of arquivos) {
      if (!cobertosPor.has(f)) cobertosPor.set(f, []);
      cobertosPor.get(f).push(arquivo);
    }
  }
  return cobertosPor;
}

// Execução avulsa (`node scripts/typecheck-cobertura.mjs`), não quando importado pelo gate
// oficial. `pathToFileURL` e não comparação de sufixo: no Windows o `argv[1]` vem com `\` e
// letra de unidade, e um `endsWith` sobre o nome do arquivo casaria qualquer script homônimo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(verificarCobertura(coletarProgramas()) ? 0 : 1);
}
