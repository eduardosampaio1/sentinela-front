import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Cadeados da Onda 8 contra o retorno do legado do frontend.
 *
 * A ordem que a onda exige é `provar canônico → desligar → provar ausência → remover`.
 * Estes cadeados são a etapa "desligar": eles tornam a reintrodução do legado um teste
 * VERMELHO, e não uma descoberta em produção. Foram escritos ANTES da remoção, de
 * propósito — um gate criado depois do fato nunca é visto falhar.
 */

const raiz = process.cwd();

/** Arquivos versionados, via git — não caminha em `node_modules` nem em `dist`.
 *
 * Filtra pelo que EXISTE no disco. `git ls-files` lista o índice, e um arquivo removido na
 * árvore mas ainda indexado (remoção pendente de commit) fazia o `readFileSync` abaixo estourar
 * com ENOENT — o gate morria por erro de leitura em vez de avaliar o invariante.
 *
 * Isso não afrouxa nada: um arquivo que não existe não tem conteúdo que possa importar de
 * `src_legacy`. O que se perde é só o crash. */
function versionados(): string[] {
  return execSync("git ls-files", { cwd: raiz, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => existsSync(`${raiz}/${f}`));
}

describe("Onda 8 — o legado do frontend não volta", () => {
  it("nenhum arquivo fora de src_legacy importa de src_legacy", () => {
    const ofensores = versionados()
      .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f) && !f.startsWith("src_legacy/"))
      // Este arquivo carrega o padrão que procura, então casa consigo mesmo. Só apareceu
      // depois do commit: enquanto estava fora do índice, `git ls-files` não o listava e
      // o cadeado nunca se via. Um gate que se acusa é um gate que alguém desliga.
      .filter((f) => !f.endsWith("onda8.legado.gate.test.ts"))
      .filter((f) => {
        const txt = readFileSync(`${raiz}/${f}`, "utf8");
        // A versão original cobria só `from "...src_legacy"` e `import("...src_legacy")`.
        // Uma review adversarial deu as mutações que passavam verde:
        //   require("../src_legacy/App")
        //   vi.mock("../src_legacy/App", () => ({}))
        //   import "../src_legacy/App"        ← efeito colateral, sem `from`
        // São três formas REAIS de um teste ou um módulo voltar a depender da pasta.
        // Aqui a regra passou a ser mais simples e mais forte: o caminho não aparece
        // dentro de string nenhuma. Um cadeado que enumera sintaxes perde para a
        // próxima sintaxe; um que proíbe o caminho, não.
        //
        // `[^"'\n]` e não `[^"']`: em JavaScript uma classe negada CASA com quebra de
        // linha, então `[^"']*` atravessava o arquivo inteiro e qualquer aspa numa linha
        // anterior alcançava a palavra `src_legacy` escrita num comentário dez linhas
        // abaixo. Foi assim que este gate acusou `src/app/router.tsx`, cujo único pecado
        // era EXPLICAR por que a rota de reset tinha sumido. Um cadeado que proíbe falar
        // do legado, em vez de depender dele, é um cadeado que ninguém consegue manter.
        return /["'][^"'\n]*src_legacy/.test(txt);
      });
    expect(ofensores).toEqual([]);
  });

  it("nenhum tsconfig inclui src_legacy", () => {
    // Eram só `tsconfig.app.json`. `tsconfig.json` (raiz) e `tsconfig.node.json` ficavam
    // de fora, e um `paths` apontando para lá passaria verde.
    const confs = versionados().filter((f) => /^tsconfig[^/]*\.json$/.test(f));
    expect(confs.length).toBeGreaterThan(0);
    for (const c of confs) {
      expect(readFileSync(`${raiz}/${c}`, "utf8"), c).not.toContain("src_legacy");
    }
  });

  it("nenhum script, config ou manifesto referencia src_legacy", () => {
    // A lista fixa de 4 arquivos deixava passar `tailwind.config.ts` (um `content:
    // ["./src_legacy/**"]` reincluiria a pasta inteira no build de CSS), `components.json`,
    // `eslint.config.js` e qualquer config novo. Agora a varredura é por PADRÃO, não por
    // enumeração: config que alguém adicionar amanhã já nasce coberto.
    const alvos = versionados().filter(
      (f) =>
        /^[^/]*\.(json|ts|js|cjs|mjs|html|yml|yaml)$/.test(f) ||
        f.startsWith("scripts/") ||
        f.startsWith("public/"),
    );
    expect(alvos.length).toBeGreaterThan(4);
    for (const alvo of alvos) {
      if (alvo === "package-lock.json" || alvo.startsWith("bun.lock")) continue; // caso próprio
      expect(readFileSync(`${raiz}/${alvo}`, "utf8"), alvo).not.toContain("src_legacy");
    }
  });

  it("nenhum teste canônico depende de src_legacy", () => {
    // `includes("src_legacy")` era forte demais: acusava qualquer teste que EXPLICASSE a
    // história — e acusou, de fato, o cadeado de rotas de auth escrito no mesmo dia, cujo
    // pecado era dizer de onde a rota de recuperação de senha tinha sumido.
    //
    // Foi a TERCEIRA vez nesta onda que um cadeado meu proibiu falar do problema em vez de
    // proibir o problema (as outras: o `[^"']*` atravessando linhas neste mesmo arquivo, e
    // o gate do RUNBOOK acusando o parágrafo que explicava a recomendação antiga). A regra
    // é a mesma dos outros casos: o CAMINHO dentro de uma string, numa linha só.
    const ofensores = versionados()
      .filter((f) => f.startsWith("src/test/"))
      .filter((f) => /["'][^"'\n]*src_legacy/.test(readFileSync(`${raiz}/${f}`, "utf8")))
      // este próprio arquivo carrega o padrão que procura
      .filter((f) => !f.endsWith("onda8.legado.gate.test.ts"));
    expect(ofensores).toEqual([]);
  });

  it("o diretório src_legacy não existe mais na árvore", () => {
    // Removido no lote 1 da Parte E, depois de dez provas independentes de desuso:
    // grau de entrada zero no grafo direcionado, nenhuma menção com prefixo
    // `src_legacy/` fora da pasta, ZERO módulos no bundle (49 sourcemaps, 123 módulos
    // do projeto), router limpo, nenhum import externo, zero fonte de CSS/asset,
    // ausência no tsconfig, testes canônicos independentes, scripts limpos, e a suíte
    // de 271 testes verde sem ele.
    //
    // Recuperável por `git show <commit-anterior>:src_legacy/<arquivo>`.
    expect(existsSync(`${raiz}/src_legacy`)).toBe(false);
  });

  /** As 30 removidas ao longo da Onda 8 (lotes 3 e 4), calculadas de `bb07779~1` → `HEAD`. */
  const REMOVIDAS = [
    "@alloc/quick-lru",
    "@hookform/resolvers",
    "@radix-ui/react-accordion",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-aspect-ratio",
    "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-hover-card",
    "@radix-ui/react-menubar",
    "@radix-ui/react-navigation-menu",
    "@radix-ui/react-popover",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-slider",
    "@radix-ui/react-switch",
    "@radix-ui/react-tabs",
    "@radix-ui/react-toggle-group",
    "@tailwindcss/typography",
    "cmdk",
    "date-fns",
    "embla-carousel-react",
    "input-otp",
    "react-day-picker",
    "react-hook-form",
    "react-resizable-panels",
    "recharts",
    "vaul",
    "zod",
  ] as const;

  it("NENHUMA das 30 dependências removidas volta ao package.json", () => {
    // A versão anterior checava só `vaul`. Uma review adversarial apontou a mutação:
    // devolver `"zod"` ou `"recharts"` ao manifesto passava verde. Um cadeado que protege
    // 1 de 30 dá a impressão de proteger a remoção inteira.
    const manifesto = JSON.parse(readFileSync(`${raiz}/package.json`, "utf8"));
    const declaradas = new Set([
      ...Object.keys(manifesto.dependencies ?? {}),
      ...Object.keys(manifesto.devDependencies ?? {}),
    ]);
    expect(REMOVIDAS.filter((d) => declaradas.has(d))).toEqual([]);
  });

  it("o lockfile concorda com o package.json sobre o que foi removido", () => {
    // Este repositório tinha TRÊS lockfiles — `package-lock.json`, `bun.lock` e
    // `bun.lockb` — e só o do npm acompanhou as remoções. Os dois do Bun não eram tocados
    // desde o commit inicial e ainda declaravam as 30: quem instalasse com Bun receberia
    // todas de volta. O manifesto dizia uma coisa e o lockfile entregava outra.
    //
    // O cadeado é sobre a dependência DIRETA, e a distinção não é preciosismo — foi o que
    // este mesmo teste ensinou ao ficar vermelho por `@alloc/quick-lru`, que continua no
    // lockfile por ser dependência transitiva do `tailwindcss`. Buscar o nome com regex
    // não separa "voltou a ser declarada" de "é dependência de quem ficou"; a entrada raiz
    // `packages[""]` do lockfile separa. Por isso a checagem é ESTRUTURAL.
    const locks = versionados().filter((f) => /lock/i.test(f) && f.endsWith(".json"));
    expect(locks, "nenhum lockfile versionado — o gate não teria o que verificar").not.toEqual(
      [],
    );
    const ofensores: string[] = [];
    for (const lock of locks) {
      const dados = JSON.parse(readFileSync(`${raiz}/${lock}`, "utf8"));
      const raizDoLock = dados.packages?.[""] ?? {};
      const diretas = new Set([
        ...Object.keys(raizDoLock.dependencies ?? {}),
        ...Object.keys(raizDoLock.devDependencies ?? {}),
      ]);
      for (const dep of REMOVIDAS) {
        if (diretas.has(dep)) ofensores.push(`${lock} → ${dep}`);
      }
    }
    expect(ofensores).toEqual([]);
  });

  it("nenhuma dependência órfã do legado volta ao package.json", () => {
    // `vaul` é a primitiva do componente `drawer`. O único arquivo que a importava vivia
    // em `src_legacy/components/ui/drawer.tsx` e saiu no lote 1; a dependência ficou
    // declarada, sem consumidor, e o lote 3 não a pegou porque a heurística de então
    // ainda contava referência em config.
    //
    // Este cadeado é sobre o NOME, não sobre a contagem: uma dependência sem consumidor
    // volta silenciosamente quando alguém copia um componente de fora e o `package.json`
    // "já tinha" o pacote. Aqui ela volta VERMELHA.
    const manifesto = JSON.parse(readFileSync(`${raiz}/package.json`, "utf8"));
    const declaradas = {
      ...(manifesto.dependencies ?? {}),
      ...(manifesto.devDependencies ?? {}),
    };
    expect(Object.keys(declaradas)).not.toContain("vaul");
  });
});
