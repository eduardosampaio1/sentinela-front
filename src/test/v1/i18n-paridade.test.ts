// M14 — a PARIDADE entre PT-BR e EN, e os defeitos de i18n que não aparecem em nenhuma tela.
//
// ## O modo como isto quebra
//
// Uma chave que existe em `pt.json` e não em `en.json` não derruba nada: `resolveKey` cai no
// inglês, não acha, e devolve **a própria chave**. O usuário lê `canonicalAnalysis.state.queued.
// title` no lugar de uma frase. Ninguém abre um bug porque quem viu não sabia que ali deveria
// haver texto — e quem sabia estava lendo no outro idioma.
//
// O mesmo vale para o placeholder. `{{count}}` que existe num idioma e não no outro produz uma
// frase gramaticalmente correta com o número faltando. É pior que erro: parece certo.
//
// ## Por que AST, e não regex
//
// Para saber quais chaves o código USA é preciso distinguir `t("chave")` de uma string qualquer
// que por acaso pareça uma chave, e de um comentário que a cite. Regex não distingue; AST sim.
//
// E há um limite honesto: `t(variavel)` não carrega chave nenhuma no texto do programa. Onde ele
// aparece, a análise de orfandade fica **inconclusiva**, e este arquivo diz isso em voz alta em
// vez de acusar 319 chaves inocentes — que foi exatamente o que a primeira medição produziu.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const IDIOMAS = ["pt", "en"] as const;

type Ramo = { [k: string]: string | Ramo };

function carregar(idioma: string): Ramo {
  return JSON.parse(readFileSync(resolve(SRC, `i18n/${idioma}.json`), "utf-8")) as Ramo;
}

/** Caminhos-folha, achatados. `a.b.c` — o mesmo formato que `t()` recebe. */
function folhas(o: Ramo, pre = "", acc: string[] = []): string[] {
  for (const [k, v] of Object.entries(o)) {
    const p = pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object") folhas(v, p, acc);
    else acc.push(p);
  }
  return acc;
}

function valores(o: Ramo, pre = "", acc = new Map<string, string>()): Map<string, string> {
  for (const [k, v] of Object.entries(o)) {
    const p = pre ? `${pre}.${k}` : k;
    if (v && typeof v === "object") valores(v, p, acc);
    else acc.set(p, String(v));
  }
  return acc;
}

const DICIONARIOS = Object.fromEntries(IDIOMAS.map((i) => [i, carregar(i)])) as Record<
  (typeof IDIOMAS)[number],
  Ramo
>;
const CHAVES = Object.fromEntries(
  IDIOMAS.map((i) => [i, new Set(folhas(DICIONARIOS[i]))]),
) as Record<(typeof IDIOMAS)[number], Set<string>>;
const VALORES = Object.fromEntries(IDIOMAS.map((i) => [i, valores(DICIONARIOS[i])])) as Record<
  (typeof IDIOMAS)[number],
  Map<string, string>
>;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M14 · 1. o gate não passa por dicionário vazio ou ausente", () => {
  for (const idioma of IDIOMAS) {
    it(`\`${idioma}.json\` existe e tem conteúdo`, () => {
      // Um dicionário vazio faria TODAS as comparações passarem: dois conjuntos vazios são
      // idênticos, e o gate reportaria paridade perfeita sobre nada.
      expect(CHAVES[idioma].size, `${idioma}.json vazio ou ilegível`).toBeGreaterThan(100);
    });
  }

  it("os dois idiomas são carregados de arquivos DIFERENTES", () => {
    // Proteção contra o gate se comparar consigo mesmo — paridade trivialmente verde.
    expect(VALORES.pt.get("canonicalAnalysis.list.records")).not.toBe(
      VALORES.en.get("canonicalAnalysis.list.records"),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Paridade de chaves — nos dois sentidos
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M14 · 2. PT-BR e EN carregam exatamente as mesmas chaves", () => {
  it("nenhuma chave existe só em PT-BR", () => {
    // Falta em EN: `resolveKey` cai no fallback inglês, não acha, e devolve a chave crua para a
    // tela. O usuário lê um caminho de JSON no lugar de uma frase.
    const so = [...CHAVES.pt].filter((k) => !CHAVES.en.has(k));
    expect(so, "chaves sem tradução em en.json").toEqual([]);
  });

  it("nenhuma chave existe só em EN", () => {
    // Falta em PT: o fallback é o próprio inglês, então a tela fica bilíngue sem avisar — o que
    // é mais difícil de notar do que um erro, porque continua sendo uma frase legítima.
    const so = [...CHAVES.en].filter((k) => !CHAVES.pt.has(k));
    expect(so, "chaves sem tradução em pt.json").toEqual([]);
  });

  it("a contagem bate", () => {
    expect(CHAVES.pt.size).toBe(CHAVES.en.size);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Paridade de interpolação
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * A ÚNICA sintaxe de interpolação. `interpolate()` em `LanguageContext` substitui `{{nome}}` e
 * mais nada.
 *
 * A M14 encontrou uma segunda sintaxe viva — `{n}`, em 5 chaves, com um consumidor fazendo
 * `.replace("{n}", …)` na mão. Funcionava naquele ponto e em nenhum outro: qualquer chamada
 * `t(chave, { n })` teria deixado o `{n}` literal na tela. As 5 foram convertidas.
 */
const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

const placeholdersDe = (texto: string) =>
  [...texto.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();

describe("M14 · 3. os parâmetros sobrevivem à tradução", () => {
  it("cada chave tem os MESMOS placeholders nos dois idiomas", () => {
    // Um `{{count}}` que existe num idioma e não no outro produz uma frase correta com o número
    // faltando. Parece certo, e é por isso que passa.
    const divergentes: string[] = [];
    for (const [chave, valorPt] of VALORES.pt) {
      const valorEn = VALORES.en.get(chave);
      if (valorEn === undefined) continue; // já coberto pela paridade de chaves
      const a = placeholdersDe(valorPt);
      const b = placeholdersDe(valorEn);
      if (a.join("|") !== b.join("|")) {
        divergentes.push(`${chave} — pt:{${a.join(",")}} en:{${b.join(",")}}`);
      }
    }
    expect(divergentes, "parâmetros divergentes entre idiomas").toEqual([]);
  });

  it("existe interpolação de verdade para este caso medir", () => {
    // Sem nenhuma chave interpolada, o caso acima passaria por vacuidade.
    const comPlaceholder = [...VALORES.pt.values()].filter((v) => PLACEHOLDER.test(v));
    PLACEHOLDER.lastIndex = 0;
    expect(comPlaceholder.length, "nenhuma chave interpolada — o caso acima não mede nada").
      toBeGreaterThan(0);
  });

  it("não há uma SEGUNDA sintaxe de placeholder", () => {
    // `{x}` simples não é interpolado por ninguém: ele chega literal à tela. Duas sintaxes para a
    // mesma coisa é o defeito que a M08 matou no nível do token — aqui ele reapareceu na copy.
    const suspeitas: string[] = [];
    for (const idioma of IDIOMAS) {
      for (const [chave, valor] of VALORES[idioma]) {
        const semDuplas = valor.replace(PLACEHOLDER, "");
        PLACEHOLDER.lastIndex = 0;
        if (/\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}/.test(semDuplas)) {
          suspeitas.push(`${idioma}:${chave} — ${valor.slice(0, 50)}`);
        }
      }
    }
    expect(suspeitas, "placeholder `{x}` que ninguém interpola").toEqual([]);
  });

  it("ninguém interpola NA MÃO com `.replace`", () => {
    // A segunda via que a M14 encontrou viva em dois arquivos: `t(chave).replace("{n}", valor)`.
    // Ela funciona onde é escrita e em nenhum outro lugar — a mesma chave usada via
    // `t(chave, params)` deixaria o placeholder literal na tela. Pior: um dos dois consumidores
    // montava a chave dinamicamente, então nem o grep pelo nome da chave o encontrava.
    const infratores: string[] = [];
    for (const p of arquivos(SRC)) {
      const rel = posix(p);
      if (/\.(test|spec)\./.test(rel) || rel.startsWith("src/test/")) continue;
      const texto = readFileSync(p, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      // Sem regex: o alvo e uma STRING literal. A primeira versao deste caso montava o padrao
      // com barra invertida dentro de heredoc, e a escape virou quebra de linha real — o arquivo
      // nao compilou. `includes` nao tem esse problema, e cobre `.replace("{n"` e `.replace("{{n"`.
      const ASPAS = [String.fromCharCode(34), String.fromCharCode(39), String.fromCharCode(96)];
      texto.split(String.fromCharCode(10)).forEach((linha, i) => {
        const manual = ASPAS.some((a) => linha.includes(".replace(" + a + "{"));
        if (manual) infratores.push(rel + ":" + (i + 1) + " — " + linha.trim().slice(0, 60));
      });
    }
    expect(infratores, "interpolação manual: use `t(chave, { param })`").toEqual([]);
  });

  it("nenhuma pluralização por sufixo — se aparecer, precisa de prova própria", () => {
    // Não há plural declarado hoje. O caso existe para que a PRIMEIRA chave `_one`/`_other` que
    // alguém adicionar chegue acompanhada da regra que a resolve, em vez de silenciosamente
    // depender de um `t()` que não sabe pluralizar.
    const comSufixo = [...VALORES.pt.keys()].filter((k) => /_(one|other|zero|few|many)$/.test(k));
    expect(
      comSufixo,
      "chave com sufixo de plural, mas `interpolate()` não pluraliza: implemente a regra e prove",
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O código e o dicionário concordam — por AST
// ═══════════════════════════════════════════════════════════════════════════════════════════

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}
const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

interface Uso {
  literais: Set<string>;
  /** `t(`prefixo.${x}`)` — dá para saber a família, não a chave. */
  prefixos: string[];
  /** `t(variavel)` — não carrega chave nenhuma no texto do programa. */
  opacos: string[];
}

function coletarUsos(): Uso {
  const literais = new Set<string>();
  const prefixos: string[] = [];
  const opacos: string[] = [];

  for (const p of arquivos(SRC)) {
    const rel = posix(p);
    if (rel.startsWith("src/i18n/") || /\.(test|spec)\./.test(rel)) continue;
    const sf = ts.createSourceFile(
      rel,
      readFileSync(p, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visitar = (no: ts.Node): void => {
      if (ts.isCallExpression(no) && ts.isIdentifier(no.expression) && no.expression.text === "t") {
        const a = no.arguments[0];
        const linha = sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;
        if (a && ts.isStringLiteral(a)) {
          literais.add(a.text);
        } else if (a && ts.isTemplateExpression(a)) {
          // O trecho estático antes da primeira interpolação identifica a família.
          const prefixo = a.head.text;
          if (prefixo) prefixos.push(prefixo);
          else opacos.push(`${rel}:${linha}`);
        } else if (a) {
          opacos.push(`${rel}:${linha}`);
        }
      }
      ts.forEachChild(no, visitar);
    };
    ts.forEachChild(sf, visitar);
  }
  return { literais, prefixos, opacos };
}

const USOS = coletarUsos();

describe("M14 · 4. o código não pede chave que não existe", () => {
  it("a coleta por AST encontrou usos de verdade", () => {
    expect(USOS.literais.size, "nenhum `t(\"...\")` encontrado — a coleta quebrou?").
      toBeGreaterThan(50);
  });

  it("nenhuma chave FANTASMA — tudo que o código pede está declarado", () => {
    // O sentido mais grave: `t("chave.que.nao.existe")` devolve a própria chave para a tela.
    // Diferente da orfandade, este lado é decidível — o literal está no programa.
    const fantasmas = [...USOS.literais]
      .filter((k) => !CHAVES.pt.has(k))
      .filter((k) => !USOS.prefixos.some((p) => k.startsWith(p)));
    expect(fantasmas, "código pede chave inexistente — ela apareceria crua na tela").toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Orfandade: o que dá para afirmar hoje, e o que não dá
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Chamadas `t(variavel)` — a razão de a orfandade não ser decidível hoje.
 *
 * Cada uma pode apontar para qualquer chave do dicionário. Uma detecção ingênua de órfãs acusou
 * **319 de 506** chaves numa árvore que não tem nenhuma órfã comprovada: `canonicalAnalysis.
 * state.*` inteiro chega por `t(chave[item.state])`.
 *
 * Então o gate não finge decidir. Ele CONGELA o número de chamadas opacas: enquanto elas
 * existirem, orfandade é inconclusiva; quando chegarem a zero, ela passa a ser mensurável. A
 * catraca é o que faz esse número andar para baixo em vez de crescer sem ninguém notar.
 */
const OPACAS_DECLARADAS = 9;

describe("M14 · 5. orfandade — o gate declara o que não consegue decidir", () => {
  it("as chamadas opacas não aumentaram", () => {
    expect(
      USOS.opacos.length,
      `chamadas \`t(variavel)\`:\n  ${USOS.opacos.join("\n  ")}\n` +
        "Cada uma torna a orfandade indecidível. Prefira `t(\\`prefixo.${x}\\`)`, que ao menos " +
        "declara a família.",
    ).toBeLessThanOrEqual(OPACAS_DECLARADAS);
  });

  it("quando encolherem, o número desce no MESMO commit", () => {
    // Sem isto, resolver uma chamada opaca deixaria folga silenciosa para outra nascer.
    expect(
      USOS.opacos.length,
      `caiu para ${USOS.opacos.length}: baixe OPACAS_DECLARADAS de ${OPACAS_DECLARADAS}`,
    ).toBe(OPACAS_DECLARADAS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. Texto hardcoded — a porta pela qual uma superfície nova nasce monolíngue
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Atributos cujo valor a pessoa LÊ. `className` e `data-testid` não entram: ninguém os lê. */
const ATRIBUTOS_VISIVEIS = new Set(["placeholder", "title", "alt", "aria-label", "aria-description"]);

function textoHardcoded(): string[] {
  const achados: string[] = [];
  for (const p of arquivos(SRC)) {
    const rel = posix(p);
    // As SUPERFÍCIES. `src/design/**` fica de fora de propósito: o Design System recebe a palavra
    // por prop — é a regra que `ProvenanceMargin.textoQuandoAusente` materializa — e um literal
    // lá dentro seria pego pelo gate da M04, não por este.
    if (!/^src\/features\/[^/]+\/ui\//.test(rel)) continue;
    if (/\.(test|spec|stories)\./.test(rel)) continue;

    const sf = ts.createSourceFile(
      rel,
      readFileSync(p, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visitar = (no: ts.Node): void => {
      const linha = () => sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1;
      if (ts.isJsxText(no)) {
        const t = no.text.trim();
        if (t.length > 2 && /[a-zA-Zà-úÀ-Ú]/.test(t)) {
          achados.push(`${rel}:${linha()} — texto "${t.slice(0, 40)}"`);
        }
      }
      if (
        ts.isJsxAttribute(no) &&
        ts.isIdentifier(no.name) &&
        ATRIBUTOS_VISIVEIS.has(no.name.text) &&
        no.initializer &&
        ts.isStringLiteral(no.initializer) &&
        no.initializer.text.trim().length > 2
      ) {
        achados.push(`${rel}:${linha()} — ${no.name.text}="${no.initializer.text.slice(0, 40)}"`);
      }
      ts.forEachChild(no, visitar);
    };
    ts.forEachChild(sf, visitar);
  }
  return achados;
}

describe("M14 · 6. nenhuma superfície nasce com texto hardcoded", () => {
  it("o gate tem superfícies para varrer", () => {
    // Sem este caso, mover ou renomear `features/*/ui/` deixaria a varredura em zero arquivos e
    // o gate reportaria verde por não ter olhado nada.
    const superficies = arquivos(SRC)
      .map(posix)
      .filter((r) => /^src\/features\/[^/]+\/ui\//.test(r) && !/\.(test|spec|stories)\./.test(r));
    expect(superficies.length, "nenhuma superfície encontrada — o alvo mudou de lugar?").
      toBeGreaterThan(5);
  });

  it("nenhum texto literal em `features/**/ui/**`", () => {
    // Zero hoje. O gate nasce protegendo, não corrigindo — e é a diferença entre chegar antes da
    // primeira superfície TO-BE e chegar depois, quando o precedente já existe.
    expect(textoHardcoded(), "texto literal numa superfície: use `t(chave)`").toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 7. O orçamento de +30 % — D37
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Quantas chaves estouram +30 % INDIVIDUALMENTE.
 *
 * O orçamento de D37 é agregado — a premissa é que PT-BR chega ~30 % mais longo que EN, e os
 * patterns precisam aguentar isso. Ele não é um teto por frase: "Verificar de novo" contra
 * "Refresh" estoura sozinho e está certo nos dois idiomas.
 *
 * Estas 45 não são defeito — são a MATÉRIA que testa os patterns. A catraca existe para que o
 * número não cresça sem alguém olhar, e para que quem encurtar uma frase o veja descer.
 */
// PERMANECE 45 na M42, e a tentativa de mexer nele foi um erro meu: eu media a razão por
// CARACTERES e este gate mede outra coisa. Subi para 47 achando que duas frases novas tinham
// estourado; o gate respondeu que o número continuava 45 — ou seja, nenhuma estourou pela régua
// que vale. A régua do gate é a autoridade, não a minha aritmética.
//
// As quatro frases que eu havia encurtado ficaram encurtadas de qualquer forma, porque a redação
// melhorou: dentro de uma seção intitulada "Instância", o rótulo não precisa repetir "da
// instância" — virou "Nome"/"Name", "Salvar nome"/"Save name" e "ID".
// 45 → 49 ao nomear os 15 outputs do `argos-catalog-1.0` que chegavam à tela como id cru.
//
// Doze dos quinze couberam. Um encolheu por mérito: dentro de uma seção intitulada "Escores",
// `AI health score` repetia a seção — virou "AI health"/"Saúde da IA", que é melhor copy e ainda
// desceu a razão. É a mesma lição que este arquivo já registrou com "da instância".
//
// ## 49 → 41: a Regra de Ouro de nomes matou os quatro piores, e não por encurtamento
//
// Os quatro que este bloco documentava como "estouro legítimo" eram TODOS nome de métrica:
//
//   `estimated_handoff_cost`   1,41   PT escrevia "handoff" (7) como "transferência" (14)
//   `projected_handoff_cost`   1,46   a mesma palavra, a mesma conta
//   `behavior_score`           1,53   "Escore de comportamento" precisava do "escore"
//   `response_stability`       1,33   estourava por um fio
//
// A Regra de Ouro "Nomes de métrica e tradução" (vault, 2026-08-17) decidiu que 34 das 39 saídas
// do ARGOS não traduzem — basta uma palavra ser construto do produto para o nome inteiro ficar em
// inglês. Os quatro viraram razão **1,00**, e junto com eles outros vinte nomes.
//
// Note o que NÃO aconteceu: ninguém encurtou frase nenhuma para caber no orçamento. A razão caiu
// porque o nome oficial passou a ser o mesmo texto nos dois idiomas — decisão de produto, com a
// queda da métrica como efeito, não como objetivo. Encurtar PT para caber continua proibido.
//
// Os 41 restantes são frase de interface, não nome de métrica: ali "transferência" e "disponível"
// seguem sendo as palavras certas em português, e o orçamento existe para proteger o layout, não
// para editar o idioma.
// **42 desde as PORTAS (2026-08-18).** A nova é `argos.portas.qualidade`:
// "Qualidade & Comportamento" (25) contra "Quality & Behavior" (18) — razão 1,39.
//
// Não encurtei, e o parágrafo acima é a razão: *encurtar PT para caber continua proibido*.
// "Comportamento" é a palavra certa em português para o que a porta agrupa, e é a mesma que
// o produto já usa no nome da métrica-mãe (`Behavior score`). Trocá-la por um sinônimo mais
// curto para satisfazer uma métrica seria editar o idioma para agradar o gate.
//
// As outras duas portas passaram sem ajuda: `economia` 0,95× e `cobertura` 1,11×. E a Visão
// geral NÃO acrescentou chave — ela reusa `argos.overview`, que já existia; a primeira versão
// desta fatia criou uma chave duplicada para a mesma palavra, e isso é o que a regra de copy
// proíbe antes mesmo de o orçamento opinar.
const ACIMA_DO_ORCAMENTO = 42;
const ORCAMENTO = 1.3;

describe("M14 · 7. PT-BR cabe no orçamento de +30 %", () => {
  const razoes = [...VALORES.pt.entries()]
    .map(([k, v]) => ({ k, pt: v.length, en: VALORES.en.get(k)?.length ?? 0 }))
    // Frases curtas distorcem a razão (2 caracteres a mais viram +40 %) sem dizer nada sobre
    // layout. O corte é sobre o que de fato ocupa espaço.
    .filter((x) => x.en >= 10)
    .map((x) => ({ ...x, razao: x.pt / x.en }));

  it("há material suficiente para a medida significar algo", () => {
    expect(razoes.length, "poucas chaves comparáveis — a média não diria nada").toBeGreaterThan(100);
  });

  it("a razão AGREGADA PT/EN está dentro do orçamento", () => {
    const media = razoes.reduce((s, x) => s + x.razao, 0) / razoes.length;
    expect(media, `razão média PT/EN = ${media.toFixed(3)} — acima do orçamento de D37`).
      toBeLessThanOrEqual(ORCAMENTO);
  });

  it("o número de frases que estouram individualmente não cresceu", () => {
    const estouram = razoes.filter((x) => x.razao > ORCAMENTO);
    expect(
      estouram.length,
      `${estouram.length} chaves acima de ${ORCAMENTO}× — se subiu, uma frase nova ficou longa ` +
        "demais; se desceu, baixe ACIMA_DO_ORCAMENTO no mesmo commit",
    ).toBe(ACIMA_DO_ORCAMENTO);
  });
});
