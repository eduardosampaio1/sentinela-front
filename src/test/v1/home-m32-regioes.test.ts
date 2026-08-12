// M32 · HOME-01 — a semântica das regiões, antes de qualquer pixel.
//
// A UI não pode decidir estado por conta própria. Estes casos fixam, por teste, QUAL estado mora
// em QUAL região de D9 — e provam que a classificação não reordena, não recalcula, não inventa
// prioridade e não perde ninguém pelo caminho.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_STATES, type AnalysisListItem, type AnalysisStatus } from "@/lib/v1";
import {
  INSTANCIAS_INALCANCAVEL,
  classificarRegioes,
  homeVazia,
} from "@/features/home/regioes";

const RAIZ = resolve(__dirname, "../../..");
const FONTE = () =>
  readFileSync(resolve(RAIZ, "src/features/home/regioes.ts"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");

const item = (over: Partial<AnalysisListItem> = {}): AnalysisListItem => ({
  analysis_id: "an-1",
  status: "completed",
  record_count: 100,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
  // BD02: a chave EXISTE sempre. `null` = análise sem Instance — que é o caso de toda a massa
  // legada. Omitir obrigaria o consumidor a distinguir "não veio" de "não tem".
  instance_id: null,
  ...over,
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Qual estado mora em qual região
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 1. o mapa estado → região", () => {
  it("Ações necessárias recebe `needs_mapping` e `failed`, e mais nada", () => {
    const r = classificarRegioes([
      item({ analysis_id: "a", status: "needs_mapping" }),
      item({ analysis_id: "b", status: "failed", result_available: false }),
    ]);
    expect(r.acoesNecessarias.map((i) => i.analysis_id)).toEqual(["a", "b"]);
    expect(r.emAndamento).toEqual([]);
    expect(r.resultadosRecentes).toEqual([]);
  });

  it("`failed` entra INDEPENDENTE de `retry_allowed` — que a listagem não publica", () => {
    // Contradição resolvida pela autoridade mais forte: o Blueprint §4.3 manda filtrar por
    // `retry_allowed` tendo a listagem como fonte, e `AnalysisListItem` não tem o campo. Esconder
    // a falha por não saber se é recuperável esconderia exatamente o que precisa de alguém.
    const chaves = Object.keys(item({ status: "failed" }));
    expect(chaves, "se a listagem passar a publicar `retry_allowed`, esta decisão muda").not.toContain(
      "retry_allowed",
    );
    const r = classificarRegioes([item({ status: "failed", result_available: false })]);
    expect(r.acoesNecessarias).toHaveLength(1);
  });

  it("Em andamento recebe os cinco estados de trabalho em curso", () => {
    const emCurso: AnalysisStatus[] = ["preparing", "receiving", "queued", "running", "recovering"];
    const r = classificarRegioes(
      emCurso.map((s, i) => item({ analysis_id: `x${i}`, status: s, result_available: false })),
    );
    expect(r.emAndamento).toHaveLength(5);
    expect(r.acoesNecessarias).toEqual([]);
    expect(r.resultadosRecentes).toEqual([]);
  });

  it("Resultados recentes exige `completed` E `result_available`", () => {
    const r = classificarRegioes([
      item({ analysis_id: "com", status: "completed", result_available: true }),
      item({ analysis_id: "sem", status: "completed", result_available: false }),
    ]);
    expect(r.resultadosRecentes.map((i) => i.analysis_id)).toEqual(["com"]);
    // E a que ficou de fora NÃO some: sumir faria "não produziu resultado" e "esta tela não sabe
    // onde pôr isto" parecerem a mesma coisa.
    expect(r.concluidasSemResultado.map((i) => i.analysis_id)).toEqual(["sem"]);
  });

  it("os OITO estados públicos estão cobertos — nenhum cai num balde de sobra", () => {
    // Se o contrato ganhar um nono estado, este caso reprova antes de a Home o engolir.
    const r = classificarRegioes(
      PUBLIC_STATES.map((s, i) => item({ analysis_id: `s${i}`, status: s, result_available: true })),
    );
    const classificados =
      r.acoesNecessarias.length + r.emAndamento.length + r.resultadosRecentes.length;
    expect(classificados).toBe(PUBLIC_STATES.length);
    expect(r.concluidasSemResultado).toEqual([]);
    expect(r.estadoNaoReconhecido).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Exclusividade — a mesma análise nunca em duas regiões
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 2. cada análise em exatamente uma região", () => {
  it("nenhum `analysis_id` aparece em dois baldes, em nenhuma combinação de estado", () => {
    const todos = PUBLIC_STATES.flatMap((s) => [
      item({ analysis_id: `${s}-com`, status: s, result_available: true }),
      item({ analysis_id: `${s}-sem`, status: s, result_available: false }),
      item({ analysis_id: `${s}-nulo`, status: s, result_available: false, record_count: null }),
    ]).map((x, i) => ({ ...x, analysis_id: `${x.analysis_id}-${i}` }));

    const r = classificarRegioes(todos);
    const baldes = [
      r.acoesNecessarias,
      r.emAndamento,
      r.resultadosRecentes,
      r.concluidasSemResultado,
      r.estadoNaoReconhecido,
    ];
    const ids = baldes.flatMap((b) => b.map((i) => i.analysis_id));
    expect(new Set(ids).size, "a mesma análise caiu em mais de uma região").toBe(ids.length);
    expect(ids).toHaveLength(todos.length);
  });

  it("um `status` fora do vocabulário público vira incidente visível, não silêncio", () => {
    const r = classificarRegioes([
      item({ analysis_id: "alien", status: "cancelled" as AnalysisStatus }),
    ]);
    expect(r.estadoNaoReconhecido.map((i) => i.analysis_id)).toEqual(["alien"]);
    expect(r.resultadosRecentes).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O que o módulo se proíbe de fazer
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 3. sem recálculo, sem prioridade inventada, sem cópia", () => {
  it("preserva a ordem da origem dentro de cada região", () => {
    const r = classificarRegioes([
      item({ analysis_id: "f1", status: "failed", result_available: false }),
      item({ analysis_id: "n1", status: "needs_mapping" }),
      item({ analysis_id: "f2", status: "failed", result_available: false }),
    ]);
    // Nada de "falha antes de mapeamento" nem "mais antigo primeiro": a ordem do cursor é a ordem.
    expect(r.acoesNecessarias.map((i) => i.analysis_id)).toEqual(["f1", "n1", "f2"]);
  });

  it("devolve os MESMOS objetos em TODOS os baldes, sem cópia e sem campo derivado", () => {
    // A 1ª versão olhava só `emAndamento`, e uma mutação que copiava o objeto em
    // `acoesNecessarias` sobreviveu ao gate. Um balde verde não fala pelos outros quatro.
    const entrada: AnalysisListItem[] = [
      item({ analysis_id: "acao", status: "needs_mapping" }),
      item({ analysis_id: "curso", status: "running", result_available: false }),
      item({ analysis_id: "pronto", status: "completed", result_available: true }),
      item({ analysis_id: "sem-doc", status: "completed", result_available: false }),
      item({ analysis_id: "alien", status: "cancelled" as AnalysisStatus }),
    ];
    const r = classificarRegioes(entrada);
    const saida = [
      ...r.acoesNecessarias,
      ...r.emAndamento,
      ...r.resultadosRecentes,
      ...r.concluidasSemResultado,
      ...r.estadoNaoReconhecido,
    ];
    expect(saida).toHaveLength(entrada.length);
    for (const original of entrada) {
      const devolvido = saida.find((x) => x.analysis_id === original.analysis_id)!;
      expect(devolvido, `objeto copiado no balde de ${original.status}`).toBe(original);
      expect(Object.keys(devolvido)).toEqual(Object.keys(original));
    }
  });

  it("não faz aritmética, não pontua e não conhece Instância nem permissão", () => {
    const f = FONTE();
    for (const proibido of [
      "score", "Math.", "reduce(", "weight", "peso", "sort(", "percent",
      "instance", "Instance", "role", "permission", "can",
    ]) {
      expect(f, `o módulo passou a fazer: ${proibido}`).not.toContain(proibido);
    }
  });

  it("a identidade das regiões é o estado do contrato, nunca texto traduzido", () => {
    const f = FONTE();
    expect(f).toContain('"needs_mapping"');
    expect(f).toContain('"recovering"');
    // Nenhuma chave de i18n decide classificação.
    expect(f).not.toContain("canonicalAnalysis.");
    expect(f).not.toContain("t(");
  });

  it("controle positivo: a varredura de proibidos enxerga um termo quando ele existe", () => {
    // Sem isto, os dois casos acima passariam sobre um arquivo vazio.
    expect(FONTE().length).toBeGreaterThan(1500);
    expect(FONTE()).toContain("classificarRegioes");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Vazio, e a região que não existe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 4. vazio e Instâncias", () => {
  it("vazio é NENHUMA análise no workspace — não `nenhuma que eu saiba classificar`", () => {
    expect(homeVazia([])).toBe(true);
    // Uma análise em estado desconhecido ainda é uma análise: a Home não pode dizer que está vazia.
    expect(homeVazia([item({ status: "cancelled" as AnalysisStatus })])).toBe(false);
  });

  it("Instâncias é inalcançável, e o módulo não fabrica agrupamento nenhum", () => {
    expect(INSTANCIAS_INALCANCAVEL).toBe(true);
    const r = classificarRegioes([item()]);
    expect(Object.keys(r)).toEqual([
      "acoesNecessarias",
      "emAndamento",
      "resultadosRecentes",
      "concluidasSemResultado",
      "estadoNaoReconhecido",
    ]);
  });
});
