// M40 · INST-05 — os gates NEGATIVOS da implementação.
//
// O Playwright prova o que a REDE recebeu; estes provam o que o código não pode fazer. As duas
// coisas são diferentes: uma spec verde diz que hoje não aconteceu, e um gate estrutural diz que
// não pode passar a acontecer sem alguém ver.
//
// Nenhum destes lê a tela. Eles leem a fonte — e a leem depois de tirar comentários, porque um
// cadeado que reprova a própria explicação obriga a apagar a explicação.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/mocks/scenarios/catalogo";
import PT from "@/i18n/pt.json";
import EN from "@/i18n/en.json";

const RAIZ = resolve(__dirname, "../../..");

const semComentarios = (f: string) =>
  f
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

const ler = (rel: string) => semComentarios(readFileSync(resolve(RAIZ, rel), "utf-8"));

const SECAO = "src/features/instances/ReferenciaDaInstancia.tsx";
const DADO = "src/features/instances/data/instance.ts";
const CLIENTE = "src/lib/v1/client.ts";
const PAGINA = "src/features/instances/InstancePage.tsx";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 0. O instrumento
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 0. o gate varre código de verdade", () => {
  it("os arquivos existem e têm conteúdo", () => {
    // Sem isto, um caminho errado faria todas as asserções abaixo passarem a vazio.
    for (const arq of [SECAO, DADO, CLIENTE, PAGINA]) {
      expect(ler(arq).length, arq).toBeGreaterThan(500);
    }
    expect(ler(SECAO)).toContain("useBaselineCandidates");
    expect(ler(CLIENTE)).toContain("setBaseline");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1-3. O Front não decide elegibilidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 1-3. a regra de elegibilidade tem UM dono, e não é o Front", () => {
  it("a seção não filtra por `completed` nem por `instance_id`", () => {
    // O recorte local é a forma mais provável do defeito: "já tenho a lista, filtro aqui". A
    // regra passaria a existir em dois lugares, e o Front seria o errado.
    const fonte = ler(SECAO);
    expect(fonte).not.toMatch(/completed/i);
    expect(fonte).not.toMatch(/\.filter\([^)]*status/);
    expect(fonte).not.toMatch(/\.filter\([^)]*instance_id/);
  });

  it("a camada de dado também não filtra", () => {
    const fonte = ler(DADO);
    const trecho = fonte.slice(fonte.indexOf("useBaselineCandidates"));
    expect(trecho).not.toMatch(/completed|\.filter\(/);
  });

  it("o ÚNICO `filter` da seção é o da régua atual — apresentação, não seleção", () => {
    // A régua sai da lista porque já está no cartão acima. Qualquer outro `filter` aqui seria
    // recorte de elegibilidade disfarçado de composição.
    const filtros = ler(SECAO).match(/\.filter\(/g) ?? [];
    expect(filtros).toHaveLength(2); // o da lista + o do `join` de procedência
    expect(ler(SECAO)).toMatch(/filter\(\(c\) => c\.analysis_id !== atual\)/);
  });

  it("a seção pede a consulta com os DOIS filtros — via hook, nunca montando query", () => {
    expect(ler(DADO)).toMatch(/baselineEligible:\s*true/);
    expect(ler(DADO)).toMatch(/instanceId/);
    // E a seção não monta URL nem chama a rede: quem fala com o Gateway é o cliente.
    //
    // O padrão aqui é `"/v1/` — com a aspa. A primeira versão usava `\/v1\/` solto e acusava o
    // `import … from "@/lib/v1"` da própria seção: um gate que reprova o import correto ensina a
    // ignorá-lo.
    const fonte = ler(SECAO);
    // `refetch()` do TanStack contém "fetch(" e é legítimo — a primeira versão deste caso o
    // acusava. O que se proíbe é o `fetch` global: a seção não fala com a rede, ela usa hooks.
    expect(/(^|[^e])fetch\(/.test(fonte), "a seção chama `fetch` direto").toBe(false);
    expect(fonte.includes('"/v1/'), "a seção monta caminho de API").toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4-6. As operações, e o que elas NÃO são
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 4-6. eleger, trocar e remover", () => {
  it("a troca NÃO passa por remoção — a seção não encadeia clear+set", () => {
    // A garantia central da BD10. Um `clearBaseline` dentro do caminho de eleição abriria uma
    // janela sem régua que o contrato não tem.
    const fonte = ler(SECAO);
    const escolher = fonte.slice(fonte.indexOf("const escolher"), fonte.indexOf("return (", fonte.indexOf("const escolher")));
    expect(escolher).not.toMatch(/remover|clearBaseline/i);
    expect(escolher).toMatch(/definir\.mutate/);
  });

  it("remover não elege substituto", () => {
    const fonte = ler(SECAO);
    const bloco = fonte.slice(fonte.indexOf("remover.mutate"), fonte.indexOf("remover.mutate") + 400);
    expect(bloco).not.toMatch(/definir\.mutate|setBaseline/);
  });

  it("o SET manda a identidade no CORPO, que é onde o Gateway lê", () => {
    const fonte = ler(CLIENTE);
    const trecho = fonte.slice(fonte.indexOf("setBaseline: ("), fonte.indexOf("clearBaseline: ("));
    expect(trecho).toMatch(/body: JSON\.stringify\(\{ baseline_analysis_id: analysisId \}\)/);
    // E NÃO na query — mandar ali funcionaria contra um mock permissivo e falharia no produtor.
    expect(trecho).not.toMatch(/baseline_analysis_id:\s*analysisId\s*,?\s*\}\s*,\s*opts/);
  });

  it("o SET não exige `Idempotency-Key`", () => {
    // O cabeçalho existe para tornar segura a repetição de uma CRIAÇÃO não idempotente. Exigi-lo
    // sugeriria que repetir sem ele é perigoso — e o `SET` é idempotente por natureza.
    const fonte = ler(CLIENTE);
    const trecho = fonte.slice(fonte.indexOf("setBaseline: ("), fonte.indexOf("clearBaseline: ("));
    // o 6º argumento de `pedir` é o flag de idempotência; ele não aparece aqui.
    expect(trecho.split("\n").filter((l) => /true\s*,?\s*$/.test(l))).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 7-10. As proibições de produto
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 7-10. o que a superfície não pode conhecer", () => {
  it("nada de auto-baseline: a seção não elege sem ação", () => {
    const fonte = ler(SECAO);
    // Nenhuma eleição em efeito: `useEffect` que chamasse `mutate` seria exatamente o
    // auto-baseline que D25 proíbe e que o caminho legado faz.
    expect(fonte).not.toMatch(/useEffect/);
    expect(fonte).not.toMatch(/latest|ultima|última|most_recent|auto/i);
  });

  it("nada de v3: a seção não pede versão de documento nem lê resultado", () => {
    const fonte = ler(SECAO) + ler(DADO);
    for (const proibido of [
      "result_schema_version",
      "analysis-result-v3",
      "getResult",
      "serves_argos",
      "comparable",
      "v3",
    ]) {
      expect(fonte.includes(proibido), `a superfície conhece \`${proibido}\``).toBe(false);
    }
  });

  it("nada de mk3, delta, direção ou tendência", () => {
    const fonte = ler(SECAO) + ler(DADO);
    for (const proibido of [
      "mk3",
      "baseline_system",
      "higher_is_better",
      "lower_is_better",
      "delta",
      "trend",
      "direction",
    ]) {
      expect(fonte.includes(proibido), `a superfície carrega \`${proibido}\``).toBe(false);
    }
  });

  it("nenhuma aritmética na seção", () => {
    // Ela transporta identidade e formata data. Não há subtração legítima aqui, e proibir o
    // operador inteiro é mais honesto que enumerar disfarces.
    const m = ler(SECAO).match(/[\w)\]]\s-\s[\w(]/);
    expect(m, `aritmética: "${m?.[0]}"`).toBeNull();
  });

  it("a seção não chama Analytics nem exclusão de Analysis", () => {
    const fonte = ler(SECAO) + ler(DADO);
    expect(fonte).not.toMatch(/useAnalysisAnalytics|getAnalytics|\/analytics/);
    // B10/BD06 não existe: uma chamada de exclusão aqui inventaria a operação que mantém o
    // scenario `baseline-active` bloqueado.
    expect(fonte).not.toMatch(/deleteAnalysis|excluirAnalise/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 11-13. Copy e superfície
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 11-13. a copy não promete comparação", () => {
  const blocos = [PT.baseline as Record<string, string>, EN.baseline as Record<string, string>];

  it("nenhuma frase sugere evolução, comparação ou direção", () => {
    // D26: ser referência NÃO significa ser comparável. Uma copy que dissesse "todas as próximas
    // análises serão comparadas" prometeria a capacidade que não existe.
    for (const bloco of blocos) {
      const texto = Object.values(bloco).join(" ").toLowerCase();
      for (const proibido of [
        "evolu", "compar", "delta", "tendên", "tenden", "melhor", "pior",
        "variaç", "trend", "improve", "worse", "progress",
      ]) {
        expect(texto.includes(proibido), `a copy diz "${proibido}"`).toBe(false);
      }
    }
  });

  it("a copy diz que a escolha é do usuário e não muda sozinha (D25)", () => {
    expect((PT.baseline as Record<string, string>).subtitle).toMatch(/nunca muda sozinha/i);
    expect((EN.baseline as Record<string, string>).subtitle).toMatch(/never changes on its own/i);
  });

  it("PT e EN têm as mesmas chaves", () => {
    expect(Object.keys(PT.baseline).sort()).toEqual(Object.keys(EN.baseline).sort());
  });

  it("a superfície vive na página da Instância, e não numa rota própria", () => {
    // Baseline não tem identidade fora da Instância; um `/baseline` de topo afirmaria que tem.
    expect(ler(PAGINA)).toContain("<ReferenciaDaInstancia");
    const router = ler("src/app/router.tsx");
    expect(router).not.toMatch(/baseline/i);
  });

  it("os três scenarios continuam executáveis e `baseline-active` continua bloqueado", () => {
    for (const id of ["no-baseline", "baseline-set", "baseline-no-candidates"]) {
      expect(CATALOGO.find((s) => s.id === id)?.estado, id).toBe("disponivel");
    }
    expect(CATALOGO.find((s) => s.id === "baseline-active")?.estado).toBe("bloqueado");
  });
});
