// M39 · EVO-02 — os gates NEGATIVOS da comparação ARGOS.
//
// O teste de unidade prova a REGRA; estes provam o que a superfície não pode fazer. Um deles
// substitui uma garantia que a F0 dava e que a M39 teve de remover: a `CompareAnalysesPage`
// estava na lista de páginas proibidas de negociar versão, e agora ela é obrigada a negociar.
// Trocar a proibição pela obrigação, e não simplesmente apagar a proibição, é o que impede a
// página de voltar ao documento legado sem ninguém notar.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/mocks/scenarios/catalogo";
import { FAMILIAS_COMPARAVEIS_M39 } from "@/features/canonical-analysis/result/familiasDaComparacao";

const RAIZ = resolve(__dirname, "../../..");
const semComentarios = (f: string) =>
  f
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
const ler = (rel: string) => semComentarios(readFileSync(resolve(RAIZ, rel), "utf-8"));

const PAGINA = "src/features/canonical-analysis/ui/CompareAnalysesPage.tsx";
const APRESENTACAO = "src/features/canonical-analysis/ui/ComparacaoArgos.tsx";
const REGRA = "src/features/canonical-analysis/result/comparacao.ts";
const ROUTER = "src/app/router.tsx";

describe("M39 · gates 1-3 · a fonte é o v3, e só ele", () => {
  it("1: a página pede a versão pelo hook que negocia", () => {
    const fonte = ler(PAGINA);
    expect(fonte, "a EVO-02 deixou de usar o hook do ARGOS").toContain("useAnalysisArgos");
    // E o hook do documento histórico NÃO é usado aqui: ele devolveria v1/v2.
    expect(fonte).not.toMatch(/\buseAnalysisResult\b/);
  });

  it("2: nenhuma leitura cai para o documento legado", () => {
    const fonte = ler(PAGINA);
    expect(fonte).not.toMatch(/resolverResultado|adaptAnalysisResultV2|compararComAnterior/);
  });

  it("3: a comparação não chama `/analytics`", () => {
    for (const arq of [PAGINA, APRESENTACAO, REGRA]) {
      expect(ler(arq), `${arq} alcança o Analytics`).not.toMatch(
        /useAnalysisAnalytics|getAnalytics|\/analytics\b/,
      );
    }
  });
});

describe("M39 · gates 4-8 · o escopo não cresce", () => {
  it("4-8: a apresentação não conhece família não autorizada", () => {
    // A catraca já protege `comparacao.ts`; aqui a mesma regra alcança a tela, que é por onde
    // uma família entraria "só para mostrar".
    const proibidas = [
      "scores",
      "projections",
      "risks",
      "intents",
      "recommendations",
      "alerts",
      "issues",
      "evidence",
      "executive_summary",
    ];
    const fonte = ler(APRESENTACAO);
    const infratoras = proibidas.filter((f) => new RegExp(f, "i").test(fonte));
    expect(infratoras, `a tela ganhou família sem autoridade: ${infratoras}`).toEqual([]);
  });

  it("o escopo continua sendo exatamente duas famílias", () => {
    expect([...FAMILIAS_COMPARAVEIS_M39].sort()).toEqual(["dimensions", "indicators"]);
  });
});

describe("M39 · gates 9-11 · o que o navegador não decide", () => {
  it("9: nenhuma subtração na REGRA", () => {
    // Só o arquivo de regra. A primeira versão varria também os `.tsx` e acusava `t-s` dentro
    // de `text-sm`: classe do Tailwind lida como aritmética. Um gate que acusa CSS ensina a
    // ignorá-lo.
    //
    // Os componentes já têm guarda melhor calibrada: `backend-first-result` proíbe aritmética
    // analítica em `ui/` com matcher próprio. Duplicá-la aqui pior seria regressão de gate.
    const m = ler(REGRA).match(/[\w)\]]\s*-\s*[\w(]/);
    expect(m, `${REGRA}: aritmética "${m?.[0]}"`).toBeNull();
  });

  it("10: A e B nunca viram anterior/atual", () => {
    // A ordem vem da URL. Com comparabilidade por família, "anterior" sugeriria série onde pode
    // não haver — e a rota não publica tempo.
    // As superfícies da EVO-02, e NÃO o arquivo de regra: `comparacao.ts` também hospeda
    // `compararComAnterior`, que serve a RES-01 — e ali "anterior" é o vocabulário CORRETO, por
    // D29 ("esta análise vs. a imediatamente anterior"). Proibir a palavra no arquivo inteiro
    // exigiria renomear a regra de outra superfície para satisfazer o gate desta.
    for (const arq of [PAGINA, APRESENTACAO]) {
      const fonte = ler(arq);
      expect(fonte, `${arq}`).not.toMatch(/\banterior\b|\batual\b|\bantes\b|\bdepois\b/i);
    }
  });

  it("11: `ai_health_score` não é tratado como dimensão", () => {
    for (const arq of [REGRA, APRESENTACAO]) {
      expect(ler(arq)).not.toMatch(/ai_health/i);
    }
  });
});

describe("M39 · gates 12-15 · estados que não podem se confundir", () => {
  it("12: quebra documental tem apresentação PRÓPRIA, não tabela vazia", () => {
    const fonte = ler(APRESENTACAO);
    expect(fonte, "a quebra não tem texto próprio").toContain("compare.breakTitle");
    // E ela sai ANTES de qualquer família ser desenhada — uma tabela vazia diria "não houve
    // diferenças", que é o oposto do que aconteceu.
    const posQuebra = fonte.indexOf("documentosComparaveis");
    const posFamilia = fonte.indexOf("cmp-indicadores");
    expect(posQuebra).toBeGreaterThan(-1);
    expect(posQuebra).toBeLessThan(posFamilia);
  });

  it("15: v3 ausente tem estado próprio, e não vira comparação parcial", () => {
    const fonte = ler(PAGINA);
    expect(fonte).toContain("compare.noArgosTitle");
    expect(fonte).toContain('estado === "recusado"');
  });

  it("a rota canônica continua congelada", () => {
    expect(ler(ROUTER)).toContain('path: "/analyses/compare/:analysisAId/:analysisBId"');
  });

  it("os dois scenarios v3 seguem no catálogo", () => {
    for (const id of ["comparison-v3-compatible", "comparison-v3-document-break"]) {
      expect(CATALOGO.find((s) => s.id === id), id).toBeTruthy();
    }
  });
});
