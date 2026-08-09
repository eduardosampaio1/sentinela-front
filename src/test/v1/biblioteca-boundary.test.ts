// M06 — o gate da fronteira da biblioteca.
//
// Mesma ordem da M05, e pela mesma razão: **primeiro** os dentes contra fonte sintética, **depois**
// a árvore real. Invertido, um analisador cego varrendo uma árvore limpa reporta verde, e ninguém
// distingue "não há violação" de "não sei procurar".
//
// A diferença desta missão é que a árvore real **não** está limpa, e isso é conhecido: os 7
// arquivos do shadcn legado em `src/components/ui/` importam Radix. A M10 já registrou por que eles
// não convergem agora — `components/ui/button` tem 27 consumidores, e criar uma segunda versão
// produziria no nível do componente o defeito que a M08 matou no nível do token. Então a dívida é
// DECLARADA e MEDIDA, com um caso que a impede de crescer e outro que obriga a lista a encolher no
// mesmo commit em que alguém resolver um arquivo.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analisarImportesDeBiblioteca, ehBibliotecaDeApresentacao } from "./fronteiraDaBiblioteca";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

function arquivos(dir: string, acc: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const e of entradas) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const ehProvaDeGate = (rel: string) => /\.(test|spec|stories)\.tsx?$/.test(rel);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os dentes — contra fonte sintética, sem depender da árvore
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M06 · 1. o analisador tem dentes", () => {
  it("acusa import de Radix — o DoD literal do plano", () => {
    const v = analisarImportesDeBiblioteca(
      "features/x/ui/Pagina.tsx",
      `import * as Dialog from "@radix-ui/react-dialog";\nexport const P = () => null;\n`,
    );
    expect(v).toHaveLength(1);
    expect(v[0].linha).toBe(1);
    expect(v[0].dinamico).toBe(false);
  });

  it("acusa `recharts` e `motion`, que ainda NÃO estão instalados", () => {
    // Preventivo de propósito: a M09 deixou "instalar Motion for React" para a Fase 5. O gate
    // precisa estar de pé ANTES da instalação — chegar depois é chegar tarde, porque a primeira
    // página que importar já terá criado o precedente.
    for (const lib of ["recharts", "motion", "motion/react", "framer-motion"]) {
      const v = analisarImportesDeBiblioteca("p.tsx", `import x from "${lib}";\n`);
      expect(v, `\`${lib}\` passou`).toHaveLength(1);
    }
  });

  it("acusa `import()` dinâmico — o contorno óbvio de um gate de import estático", () => {
    const v = analisarImportesDeBiblioteca(
      "p.tsx",
      `export const abrir = () => import("@radix-ui/react-dialog");\n`,
    );
    expect(v).toHaveLength(1);
    expect(v[0].dinamico).toBe(true);
  });

  it("NÃO acusa comentário — é o que separa AST de grep", () => {
    const v = analisarImportesDeBiblioteca(
      "p.tsx",
      `// esta página não importa @radix-ui/react-dialog nem recharts\n` +
        `/* nem em bloco: import x from "motion" */\nexport const P = () => null;\n`,
    );
    expect(v, JSON.stringify(v)).toHaveLength(0);
  });

  it("NÃO acusa biblioteca que apenas começa parecido", () => {
    for (const lib of ["react", "recharts-alternativa-que-nao-existe", "motionless"]) {
      expect(ehBibliotecaDeApresentacao(lib), `\`${lib}\` foi acusado por engano`).toBe(false);
    }
    expect(ehBibliotecaDeApresentacao("@radix-ui/react-slot")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Anti-vacuidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

const TODOS = arquivos(SRC).map((p) => ({
  rel: posix(p),
  achados: analisarImportesDeBiblioteca(posix(p), readFileSync(p, "utf-8")),
}));

const COM_IMPORT = TODOS.filter((x) => x.achados.length > 0 && !ehProvaDeGate(x.rel));

describe("M06 · 2. o gate não passa por vacuidade", () => {
  it("pelo menos uma das bibliotecas proibidas está REALMENTE instalada", () => {
    // Um gate que só proíbe pacotes ausentes é decoração: ele nunca teria a chance de reprovar
    // nada. Hoje quem sustenta este caso é Radix; `recharts` e `motion` não estão instalados e a
    // proibição deles é preventiva — declarada, não disfarçada de proteção ativa.
    const pkg = JSON.parse(readFileSync(resolve(RAIZ, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const instalados = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(
      instalados.filter(ehBibliotecaDeApresentacao),
      "nenhuma biblioteca de apresentação instalada — o gate não teria o que proteger",
    ).not.toEqual([]);
  });

  it("a varredura enxerga arquivos que de fato importam essas bibliotecas", () => {
    // Se este número for a zero, ou a dívida foi resolvida (e a lista abaixo tem de encolher no
    // mesmo commit) ou a varredura perdeu o alvo. As duas exigem alguém olhar.
    expect(COM_IMPORT.length, "a varredura não achou nenhum import — alvo perdido?").
      toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A árvore real — quem pode, quem deve, e quem não podia
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * DÍVIDA DECLARADA — o shadcn legado.
 *
 * Estes 7 arquivos importam Radix e ficam onde estão **por decisão registrada**, não por descuido:
 * a M10 documentou que `components/ui/button` tem 27 consumidores e que criar uma segunda versão
 * no `src/design/**` reproduziria, no nível do componente, o defeito de vocabulário duplo que a
 * M08 matou no nível do token. Eles convergem quando forem tocados por missão própria.
 *
 * A lista é NOMINAL para poder ser medida. `src/components/ui/**` como padrão de pasta faria
 * qualquer arquivo novo entrar na dívida de graça — que é como dívida declarada vira permissão.
 */
const DIVIDA_SHADCN: readonly string[] = [
  "src/components/ui/button.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/dropdown-menu.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/toast.tsx",
  "src/components/ui/tooltip.tsx",
];

const ehDesign = (rel: string) => rel.startsWith("src/design/");

describe("M06 · 3. biblioteca de apresentação só dentro do Design System", () => {
  it("nenhum arquivo FORA de `src/design/**` e fora da dívida declarada importa", () => {
    // O coração da missão, e o DoD do plano: importar Radix em `features/**/ui/**` fica vermelho.
    const infratores = COM_IMPORT.filter(
      (x) => !ehDesign(x.rel) && !DIVIDA_SHADCN.includes(x.rel),
    ).map((x) => `${x.rel}:${x.achados[0].linha} — ${x.achados[0].especificador}`);
    expect(infratores, "biblioteca de apresentação virou API pública de página").toEqual([]);
  });
});

describe("M06 · 4. a dívida declarada só pode encolher", () => {
  const naDivida = COM_IMPORT.filter((x) => DIVIDA_SHADCN.includes(x.rel)).map((x) => x.rel);

  it("a lista não cresceu", () => {
    expect(DIVIDA_SHADCN.length, "alguém acrescentou dívida em vez de resolvê-la").toBe(7);
  });

  it("todo arquivo declarado AINDA importa — senão a lista está desatualizada", () => {
    // Este é o caso que faz a dívida encolher no MESMO commit: no instante em que alguém tira o
    // Radix de um destes arquivos, o gate fica vermelho até a linha sair daqui. Sem ele, a lista
    // sobreviveria ao problema e viraria uma permissão para quem chegasse depois com o mesmo nome.
    const resolvidos = DIVIDA_SHADCN.filter((f) => !naDivida.includes(f));
    expect(
      resolvidos,
      "estes arquivos não importam mais biblioteca de apresentação: remova-os de DIVIDA_SHADCN",
    ).toEqual([]);
  });

  it("a dívida está inteira em `src/components/ui/` — não se espalhou", () => {
    const foraDaPasta = DIVIDA_SHADCN.filter((f) => !f.startsWith("src/components/ui/"));
    expect(foraDaPasta, "dívida declarada fora do shadcn legado").toEqual([]);
  });
});
