// M39 — a CATRACA do congelamento.
//
// Até este checkpoint a M39 estava congelada por decisão: nada impedia `comparacao.ts` de ganhar
// `scores` numa tarde, e o que separava "congelado" de "ninguém mexeu ainda" era memória. Este
// arquivo transforma o limite em governança executável.
//
// ## O que ele prova, e por que assim
//
// A prova é ESTRUTURAL, sobre um registro fechado (`CLASSIFICACAO_M39`), e não sobre a presença
// de um comentário. Comentário é declaração de intenção; o registro é o que a implementação
// futura vai consultar, e é ele que uma expansão oportunista teria de alterar.
//
// A segunda metade da prova olha o CÓDIGO da regra canônica: um registro correto com uma
// implementação que o ignora seria a pior das duas — autoridade tranquila sobre comportamento
// divergente.
//
// ## O que ele NÃO faz
//
// Não exige que a comparação exista. A M39 segue com implementação congelada, e o gate é sobre o
// que ela pode vir a ser.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FAMILIAS_ARGOS } from "@/features/canonical-analysis/result/contratoV3";
import {
  CLASSIFICACAO_M39,
  FAMILIAS_COMPARAVEIS_M39,
  PRECONDICOES_DE_DOCUMENTO,
  PRECONDICOES_DE_PAR,
} from "@/features/canonical-analysis/result/familiasDaComparacao";

const RAIZ = resolve(__dirname, "../../..");
const CANONICA = "src/features/canonical-analysis/result/comparacao.ts";
const PAGINA = "src/features/canonical-analysis/ui/CompareAnalysesPage.tsx";

/** CRLF normalizado ANTES de tudo: `core.autocrlf=true` faz os bytes variarem por plataforma. */
const ler = (rel: string) =>
  readFileSync(resolve(RAIZ, rel), "utf-8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");

/** As nove que a M39 V1 NÃO compara. */
const NAO_AUTORIZADAS = FAMILIAS_ARGOS.filter((f) => !FAMILIAS_COMPARAVEIS_M39.includes(f));

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. O registro é fechado, e cobre exatamente o contrato
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · catraca 1. o registro de famílias é FECHADO", () => {
  it("toda família do contrato tem classificação — nenhuma esquecida", () => {
    // "Não está na lista" não diz se é decisão, falta de contrato ou esquecimento. Aqui a
    // ausência de classificação é vermelha, e a família nova do produtor obriga uma decisão.
    for (const familia of FAMILIAS_ARGOS) {
      expect(CLASSIFICACAO_M39[familia], `\`${familia}\` sem classificação`).toBeTruthy();
    }
  });

  it("nenhuma família INVENTADA entrou no registro", () => {
    const classificadas = Object.keys(CLASSIFICACAO_M39).sort();
    expect(classificadas).toEqual([...FAMILIAS_ARGOS].sort());
  });

  it("toda classificação declara o PORQUÊ", () => {
    // Estado sem motivo vira dogma órfão: ninguém sabe se ainda vale nem o que o resolveria.
    for (const familia of FAMILIAS_ARGOS) {
      expect(CLASSIFICACAO_M39[familia].porque.length, familia).toBeGreaterThan(40);
    }
  });

  it("família autorizada tem identidade contratual; família bloqueada NÃO tem", () => {
    // A correspondência que sustenta a regra inteira: comparar exige identidade declarada, e
    // `BLOCKED_BY_CONTRACT` significa exatamente que ela não existe.
    for (const familia of FAMILIAS_ARGOS) {
      const c = CLASSIFICACAO_M39[familia];
      if (c.estado === "PAIR") {
        expect(c.identidade, `${familia}: autorizada sem identidade`).toBeTruthy();
      }
      if (c.estado === "BLOCKED_BY_CONTRACT") {
        expect(c.identidade, `${familia}: bloqueada por contrato mas com identidade`).toBeNull();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. O escopo da M39 V1 é EXATAMENTE duas famílias
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · catraca 2. escopo reduzido, congelado", () => {
  it("as famílias comparáveis são `indicators` e `dimensions`, e só elas", () => {
    expect([...FAMILIAS_COMPARAVEIS_M39].sort()).toEqual(["dimensions", "indicators"]);
  });

  it("cada não-autorizada declara POR QUE não entra", () => {
    const estados = new Set(NAO_AUTORIZADAS.map((f) => CLASSIFICACAO_M39[f].estado));
    expect(estados.has("PAIR"), "uma não-autorizada está marcada como PAIR").toBe(false);
    expect(NAO_AUTORIZADAS.length).toBe(9);
  });

  it("`intents` e `recommendations` estão bloqueadas por CONTRATO, não por escolha de tela", () => {
    // A distinção importa na reentrada: `OUT_OF_M39_V1` volta com scenario e gate;
    // `BLOCKED_BY_CONTRACT` só volta quando o produtor publicar identidade longitudinal.
    expect(CLASSIFICACAO_M39.intents.estado).toBe("BLOCKED_BY_CONTRACT");
    expect(CLASSIFICACAO_M39.recommendations.estado).toBe("BLOCKED_BY_CONTRACT");
  });

  it("`executive_summary` não é coleção pareável", () => {
    expect(CLASSIFICACAO_M39.executive_summary.estado).toBe("SIDE_BY_SIDE_ONLY");
  });

  it("as pré-condições de par cobrem exatamente as famílias autorizadas", () => {
    expect(Object.keys(PRECONDICOES_DE_PAR).sort()).toEqual([...FAMILIAS_COMPARAVEIS_M39].sort());
  });

  it("a pré-condição de DOCUMENTO (D26) continua declarada", () => {
    expect(PRECONDICOES_DE_DOCUMENTO).toContain("indicator_registry_version");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A implementação não ultrapassa a autoridade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · catraca 3. `comparacao.ts` não cresce sem autoridade", () => {
  it("o gate varre código de verdade (sanidade)", () => {
    // Sem isto, um caminho errado faria todas as asserções abaixo passarem a vazio.
    expect(ler(CANONICA).length).toBeGreaterThan(500);
    expect(ler(CANONICA)).toContain("compararComAnterior");
  });

  it("a regra canônica não menciona NENHUMA família não autorizada", () => {
    const codigo = ler(CANONICA);
    // INSENSÍVEL A CAIXA e sem `\b`: a primeira versão usava `\bscores\b`, e uma função chamada
    // `compararScores` passava batido — a mutação sobreviveu e mostrou o buraco. Uma família
    // entrando disfarçada de camelCase é exatamente o jeito como ela entraria de verdade.
    const infratoras = NAO_AUTORIZADAS.filter((f) => new RegExp(f, "i").test(codigo));
    expect(
      infratoras,
      `\`comparacao.ts\` ganhou família sem autoridade: ${infratoras.join(", ")}. ` +
        "Antes de crescer: família autorizada, identidade contratual, pré-condições congeladas, " +
        "scenario e gate.",
    ).toEqual([]);
  });

  it("a regra canônica não faz matching de CONJUNTO", () => {
    // "persistiu/apareceu/sumiu" exige identidade canônica (D27). Sem ela, o vocabulário sozinho
    // já é a afirmação proibida.
    const codigo = ler(CANONICA);
    for (const termo of ["persistiu", "apareceu", "desapareceu", "persisted", "appeared"]) {
      expect(codigo.includes(termo), `vocabulário de conjunto em ${CANONICA}: ${termo}`).toBe(false);
    }
  });

  it("a regra canônica não calcula delta", () => {
    // QUALQUER subtração binária, e não só as formas que eu lembrei de listar. A primeira versão
    // procurava `.value - ` e `antes - depois`; a mutação `const d = 1 - 0` sobreviveu.
    //
    // O módulo não tem aritmética legítima: ele pareia por identidade e transporta texto já
    // formatado pelo adapter. Proibir o operador inteiro é mais honesto que enumerar disfarces.
    const codigo = ler(CANONICA);
    const subtracao = codigo.match(/[\w)\]]\s*-\s*[\w(]/);
    expect(subtracao, `aritmética em ${CANONICA}: "${subtracao?.[0]}"`).toBeNull();
    expect(codigo).not.toMatch(/\bpercentual\b|\btend[êe]ncia\b|\bmelhor(ou|ia)\b|\bpiorou\b/i);
  });

  it("A e B não viram `anterior`/`atual` na superfície da comparação", () => {
    // A ordem vem da URL, não do tempo. E com comparabilidade por família, "anterior" sugeriria
    // série onde pode não haver.
    const pagina = ler(PAGINA);
    expect(pagina).not.toMatch(/\banterior\b/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A fronteira das duas visões
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M39 · catraca 4. a comparação pertence à visão ARGOS", () => {
  it("a regra canônica não conhece o Analytics", () => {
    const codigo = ler(CANONICA);
    expect(codigo).not.toMatch(/analytics|snapshot|concentrations|time_series|distributions/i);
  });

  it("a página de comparação não chama `/analytics`", () => {
    expect(ler(PAGINA)).not.toMatch(/useAnalysisAnalytics|getAnalytics/);
  });

  it("Semantic Drift nunca é descrito como drift ENTRE A e B", () => {
    // Drift é medido DENTRO de uma análise. Dois valores lado a lado não são um drift novo, e
    // nomeá-los assim inventaria uma métrica que produtor nenhum publicou.
    for (const arq of [CANONICA, PAGINA]) {
      const codigo = ler(arq);
      expect(codigo).not.toMatch(/drift\s*(entre|between)|driftAB|drift_a_b/i);
    }
  });
});
