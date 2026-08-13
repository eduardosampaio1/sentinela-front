// F6 — os gates NEGATIVOS da experiência de duas visões.
//
// Cada um existe contra um defeito específico que já custou caro nesta plataforma, e todos
// falam da mesma regra: **uma Analysis, duas leituras, e elas não se fundem**.
//
// Os testes de comportamento das duas views provam o que a tela FAZ. Estes provam o que ela
// NÃO PODE FAZER — e por estrutura, porque comportamento não cobre o caminho que ninguém
// pensou em exercitar.

import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VISOES_DA_ANALISE } from "@/features/canonical-analysis/ui/visoes";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const FEATURE = resolve(SRC, "features/canonical-analysis");

function listar(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listar(p));
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

function semComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const ler = (rel: string) => semComentarios(readFileSync(resolve(SRC, rel), "utf-8"));

const ARGOS_VIEW = "features/canonical-analysis/ui/argos/ArgosView.tsx";
const ANALYTICS_VIEW = "features/canonical-analysis/ui/analytics/AnalyticsView.tsx";
const ROUTER = "app/router.tsx";

describe("F6 · os matchers têm dentes (sanidade)", () => {
  // Sem isto, um gate que procura a string errada passa sempre e não protege nada.
  it("os arquivos existem e têm conteúdo", () => {
    for (const arq of [ARGOS_VIEW, ANALYTICS_VIEW, ROUTER]) {
      expect(ler(arq).length, `${arq} vazio ou ausente`).toBeGreaterThan(200);
    }
  });
});

describe("F6 · 1-2 · cada visão tem UMA fonte", () => {
  it("1: a visão ARGOS não chama `/analytics`", () => {
    // Refundir os dois motores pela porta dos fundos é o defeito que o v3 desfez no backend.
    const fonte = ler(ARGOS_VIEW);
    expect(fonte).not.toMatch(/useAnalysisAnalytics|getAnalytics|\/analytics\b/);
  });

  it("2: a visão Analytics não pede o documento do resultado", () => {
    const fonte = ler(ANALYTICS_VIEW);
    expect(fonte).not.toMatch(/useAnalysisArgos|useAnalysisResult|getResult/);
    expect(fonte).not.toContain("result_schema_version");
  });

  it("2b: a visão Analytics não lê o bloco analítico EMBUTIDO do v2", () => {
    // O v2 é o documento que funde os dois motores. Lê-lo aqui daria duas fontes para o mesmo
    // dado, e elas já têm prazos diferentes — o v2 só existe depois da barreira.
    const fonte = ler(ANALYTICS_VIEW);
    expect(fonte).not.toMatch(/adapterV2|adaptAnalysisResultV2|BlocoAnalitico/);
  });
});

describe("F6 · 3-5 · a negociação de versão", () => {
  it("3: a visão ARGOS pede a versão EXPLICITAMENTE", () => {
    const fonte = ler(ARGOS_VIEW);
    expect(fonte).toMatch(/useAnalysisArgos/);
    const hook = semComentarios(
      readFileSync(resolve(FEATURE, "data/argos.ts"), "utf-8"),
    );
    // No SITE DA CHAMADA, não em qualquer lugar do arquivo.
    //
    // A primeira versão usava `toContain("PEDIDO_DE_V3")`, e uma mutação da M39 sobreviveu a
    // ela: trocar o ARGUMENTO por `""` deixa o `import` intacto, a string presente e o gate
    // verde — enquanto a requisição sai sem versão e a tela mostra o documento histórico
    // achando que mostra o ARGOS. "A string aparece" não é "a string é usada".
    //
    // Quem pegava era só o Playwright. Depender do browser para a invariante central desta
    // superfície deixa a suíte rápida cega justamente no risco que mais importa.
    expect(
      hook.replace(/\s+/g, " "),
      "o hook do ARGOS deixou de PASSAR a versão para `getResult`",
    ).toMatch(/getResult\([^)]*PEDIDO_DE_V3/);
  });

  it("4: remover o pedido de versão QUEBRA o gate (mutação declarada)", () => {
    // Prova do instrumento: se a asserção acima fosse sobre outra coisa, apagar o pedido
    // passaria despercebido. Aqui a mutação é simulada sobre o texto real.
    const hook = semComentarios(readFileSync(resolve(FEATURE, "data/argos.ts"), "utf-8"));
    const mutado = hook.replace(/PEDIDO_DE_V3/g, "");
    expect(mutado.includes("PEDIDO_DE_V3")).toBe(false);
    expect(hook.includes("PEDIDO_DE_V3")).toBe(true);
  });

  it("5: v3 ausente NÃO cai para o v1 — a fronteira recusa", () => {
    const adapter = semComentarios(
      readFileSync(resolve(FEATURE, "result/adapterV3.ts"), "utf-8"),
    );
    // Nenhum caminho do adapter v3 chama o adapter de outra versão.
    expect(adapter).not.toMatch(/adaptAnalysisResult\b|adaptAnalysisResultV2|adaptar\b/);
    expect(adapter).toContain("recusado");
  });

  it("5b: a fronteira LEGADA continua sem ramo v3", () => {
    // De propósito: a página `/result` não sabe desenhar o ARGOS, e um ramo v3 ali faria o v1
    // aceitar a espinha comum e descartar as dez outras famílias em silêncio.
    const adaptar = semComentarios(
      readFileSync(resolve(FEATURE, "result/adaptar.ts"), "utf-8"),
    );
    expect(adaptar).not.toMatch(/V3|analysis-result-v3/);
  });
});

describe("F6 · 6-8 · o que o navegador não decide", () => {
  const viewsDasDuas = [ARGOS_VIEW, ANALYTICS_VIEW].map(ler);

  it("6: `not_measured` não vira 0 — nenhuma view usa zero como substituto de ausência", () => {
    for (const fonte of viewsDasDuas) {
      expect(fonte).not.toMatch(/\?\?\s*0\b|\|\|\s*0\b/);
    }
  });

  it("7: faixa de risco não nasce no Front", () => {
    const fonte = ler(ARGOS_VIEW);
    // Nenhum limiar literal comparado a valor: `band` é dado, e sem ele não há faixa.
    expect(fonte).not.toMatch(/>\s*0\.\d+|<\s*0\.\d+|>=\s*\d+\s*\?|<=\s*\d+\s*\?/);
  });

  it("8: Drift não vira delta — nenhuma view subtrai medições", () => {
    // Semantic Drift é métrica PRODUZIDA pelo ARGOS. `A - B` calculado aqui seria outra coisa
    // com o mesmo nome, e a diferença só apareceria quando alguém decidisse por ela.
    for (const fonte of viewsDasDuas) {
      expect(fonte).not.toMatch(/\bdelta\b|\.value\s*-\s*|anterior\.value/);
    }
  });
});

describe("F6 · 9-10 · os dois vocabulários de 'dimensão'", () => {
  it("9: dimensões do Analytics não entram na visão ARGOS", () => {
    const fonte = ler(ARGOS_VIEW);
    expect(fonte).not.toMatch(/concentrations|time_series|snapshot|distributions/);
  });

  it("10: dimensões de saúde do ARGOS não entram na visão Analytics", () => {
    const fonte = ler(ANALYTICS_VIEW);
    expect(fonte).not.toMatch(/DIMENSOES_DE_SAUDE|argos\.dimension\b/);
  });
});

describe("F6 · 11-12 · a rota legada", () => {
  it("11: nenhuma navegação canônica NOVA aponta para `/result`", () => {
    // A rota legada continua funcionando para deep link antigo. O que ela não pode é ser o
    // destino de navegação nova quando a visão correta existe.
    const novos = [
      resolve(FEATURE, "ui/AnalysisShell.tsx"),
      resolve(FEATURE, "ui/argos/ArgosView.tsx"),
      resolve(FEATURE, "ui/analytics/AnalyticsView.tsx"),
      resolve(FEATURE, "ui/visoes.ts"),
    ];
    for (const arq of novos) {
      const fonte = semComentarios(readFileSync(arq, "utf-8"));
      // A ROTA, e não qualquer segmento de caminho. A primeira versão deste gate acusou
      // `../../result/adapterV3` — diretório de código — e teria empurrado uma renomeação
      // inútil para satisfazer um falso positivo meu.
      expect(fonte, `${arq} aponta para a rota legada`).not.toMatch(
        /analyses\/[^"'`\n]*\/result|"\/analyses\/:analysisId\/result"/,
      );
    }
  });

  it("12: a rota legada CONTINUA registrada", () => {
    // O outro lado da mesma regra: aposentá-la em silêncio quebraria todo link salvo.
    expect(ler(ROUTER)).toContain('path: "/analyses/:analysisId/result"');
  });

  it("12b: `/result` não ganhou redirect que mude o significado do link", () => {
    const router = ler(ROUTER);
    const linha = router
      .split("\n")
      .find((l) => l.includes('"/analyses/:analysisId/result"')) as string;
    expect(linha).toBeTruthy();
    expect(linha, "a rota legada virou redirect").not.toMatch(/Navigate|Redireciona/);
  });
});

describe("F6 · 13-14 · famílias e export", () => {
  it("13: família omitida não vira lista vazia", () => {
    // A tela pergunta se a família foi PRODUZIDA antes de desenhar a seção. Sem isso, ausência
    // e vazio viram a mesma pixel — e uma delas afirma "procuramos e não há".
    const fonte = ler(ARGOS_VIEW);
    expect(fonte).toContain("familiaFoiProduzida");
    const contrato = semComentarios(
      readFileSync(resolve(FEATURE, "result/contratoV3.ts"), "utf-8"),
    );
    // A função distingue `undefined`/`null` de `[]` — se passar a olhar `.length`, colapsa.
    expect(contrato).toMatch(/valor !== undefined && valor !== null/);
  });

  it("14: o export canônico pertence à visão Analytics", () => {
    expect(ler(ANALYTICS_VIEW)).toContain("AcaoDeExport");
    expect(ler(ARGOS_VIEW)).not.toContain("AcaoDeExport");
  });
});

describe("F5 · a rota legada esta VIVA e nao e anunciada", () => {
  it("a pagina legada se declara LEGACY COMPATIBILITY", () => {
    // Sem a marca, a proxima pessoa acrescenta feature nela achando que e a superficie
    // canonica — e a rota que existe para nao mudar passa a mudar.
    const bruto = readFileSync(resolve(SRC, "features/canonical-analysis/ui/ResultPage.tsx"), "utf-8");
    expect(bruto).toContain("LEGACY COMPATIBILITY");
    expect(bruto, "a marca precisa dizer onde a capacidade nova pertence").toMatch(
      /\/analyses\/:id\/argos|\/analyses\/:id\/analytics/,
    );
  });

  it("a jornada oferece as DUAS visoes, e nao o legado", () => {
    // O outro lado de 11: nao basta a rota nova existir; ela precisa ser alcancavel de onde a
    // pessoa esta. Antes desta fase, o unico caminho a partir da jornada era o `/result`.
    const jornada = ler("features/canonical-analysis/ui/AnalysisPage.tsx");
    expect(jornada).toContain("VISOES_DA_ANALISE");
    expect(jornada, "a jornada ainda anuncia a rota legada").not.toMatch(
      /analyses\/[^"'`\n]*\/result/,
    );
  });

  it("a lista de visoes e UMA — jornada e shell nao mantem copias", () => {
    // Duas listas independentes divergem no primeiro ajuste, e a jornada passaria a oferecer
    // uma visao que o shell nao conhece (ou o contrario).
    for (const arq of [
      "features/canonical-analysis/ui/AnalysisPage.tsx",
      "features/canonical-analysis/ui/AnalysisShell.tsx",
    ]) {
      expect(ler(arq), `${arq} nao usa a lista canonica`).toContain("VISOES_DA_ANALISE");
    }
  });
});

describe("F6 · 15 · subrota, nunca aba", () => {
  it("nenhum arquivo da feature usa `Tabs` ou `role=\"tab\"`", () => {
    // O produto não possui o pattern. Inventá-lo seria primitivo estrutural novo sem
    // equivalente — e a aba perderia deep link, refresh e histórico.
    for (const arq of listar(FEATURE)) {
      const fonte = semComentarios(readFileSync(arq, "utf-8"));
      expect(fonte, `${arq} usa aba`).not.toMatch(/role=["']tab|<Tabs\b|TabsTrigger|TabsList/);
    }
  });

  it("toda visão declarada tem rota registrada, e vice-versa", () => {
    // O contrato interno entre o shell e o router. Item sem rota manda ao 404 (parece
    // funcionar); rota sem item é visão inalcançável.
    const router = ler(ROUTER);
    for (const visao of VISOES_DA_ANALISE) {
      expect(router, `visão \`${visao.caminho}\` sem rota`).toContain(
        `path: "/analyses/:analysisId/${visao.caminho}"`,
      );
    }
    const registradas = [...router.matchAll(/path: "\/analyses\/:analysisId\/([a-z]+)"/g)]
      .map((m) => m[1])
      .filter((c) => c !== "result");
    expect(registradas.sort()).toEqual(VISOES_DA_ANALISE.map((v) => v.caminho).sort());
  });
});
