// M46 — os erros de lint não voltam em silêncio.
//
// ## Por que uma catraca, e não só a correção
//
// Nove erros de eslint atravessaram a M45 inteira. Eles apareceram como *errata* em três
// DOC-CLOSEs seguidos — "pré-existentes, não são desta tranche" — e ninguém os corrigiu, porque
// nada os fazia doer. Dívida que só aparece na prosa do relatório é dívida que fica.
//
// A M46 corrigiu oito e isolou o nono num alias com motivo escrito. Este gate impede que o número
// suba de novo sem alguém decidir conscientemente.
//
// ## Por que subprocesso, e não a API do eslint
//
// Chamar `new ESLint()` aqui dentro morre com `signal?.throwIfAborted is not a function`: o
// ambiente da suíte é `jsdom`, e o `AbortSignal` do jsdom não tem esse método. Declarar o ambiente
// Node no docblock também não serve — o setup compartilhado da suíte toca `window` e explode antes
// de coletar. O subprocesso roda o eslint no Node de verdade e devolve JSON.
//
// NOTA: não escreva aqui o nome do docblock de ambiente do vitest. Ele é procurado por regex no
// arquivo INTEIRO, inclusive dentro de comentário — a primeira versão desta explicação citava o
// token e, com isso, LIGAVA o ambiente que o parágrafo dizia não funcionar. O comentário virou
// configuração, e o erro que apareceu foi exatamente o que ele descrevia.
//
// ## Por que `toBe([])` para erro e teto para warning
//
// Erro é zero, e ponto. Warning tem TETO: as 14 restantes são `react-refresh/only-export-components`,
// uma regra de experiência de desenvolvimento que pede mover exports para outro arquivo —
// refatoração de arquitetura, não correção. O teto impede que cresçam enquanto ninguém decide se
// vale mexer, e aqui `toBeLessThanOrEqual` é correto (ao contrário do gate de a11y da M45.7):
// warning que some é subproduto de refatoração alheia, não uma correção que alguém precisa
// registrar. O que não pode é subir.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface ArquivoLintado {
  readonly filePath: string;
  readonly warningCount: number;
  readonly messages: readonly { severity: number; line: number; ruleId: string | null }[];
}

describe("M46 · a catraca do lint", () => {
  it(
    "zero erros, e no máximo 14 warnings",
    () => {
      let saida: string;
      try {
        // O binário chamado pelo próprio Node, e não por `npx`.
        //
        // `execFileSync("npx.cmd", …)` falha com `EINVAL` no Windows desde que o Node passou a
        // recusar `.cmd` sem `shell: true` — e ligar o shell só para contornar isso traria de volta
        // as regras de escape do cmd.exe. Apontar para o `.js` resolve nos dois sistemas.
        saida = execFileSync(
          process.execPath,
          [resolve(process.cwd(), "node_modules/eslint/bin/eslint.js"), ".", "--format", "json"],
          { cwd: process.cwd(), encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 },
        );
      } catch (e) {
        // O eslint sai com código 1 quando ENCONTRA erro — e nesse caso o JSON está no stdout, que
        // é justamente o que precisamos ler. Só é falha de instrumento se não vier stdout nenhum.
        const err = e as { stdout?: string };
        if (!err.stdout) throw e;
        saida = err.stdout;
      }

      const resultados = JSON.parse(saida) as ArquivoLintado[];

      // O PISO DO INSTRUMENTO. Se o padrão parar de casar arquivos, `resultados` vem vazio e as
      // duas asserções abaixo passam por vacuidade — anunciando lint limpo sobre nada.
      expect(resultados.length, "o eslint não analisou arquivo nenhum").toBeGreaterThan(100);

      const erros = resultados.flatMap((r) =>
        r.messages
          .filter((m) => m.severity === 2)
          .map((m) => `${r.filePath.split(/[\\/]/).pop()}:${m.line} ${m.ruleId ?? "?"}`),
      );
      const warnings = resultados.reduce((s, r) => s + r.warningCount, 0);

      expect(erros, `erro(s) de lint:\n  ${erros.join("\n  ")}`).toEqual([]);
      expect(warnings, "o número de warnings de lint cresceu").toBeLessThanOrEqual(14);
    },
    180_000,
  );
});
