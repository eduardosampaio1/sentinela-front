// M28 — RES-01: Trust e timeline.
//
// ## O DoD governa a forma
//
// *"cada elemento exibido tem origem canônica apontável."* Cada linha de Trust imprime o CAMPO de
// contrato que a produziu, e um gate compara os campos impressos com os que o Blueprint §10 lista.
//
// ## Nenhum trust score
//
// Blueprint §10 abre com *"Só informação canônica existente. Nenhum trust score inventado."*
// Digest é identidade, não nota — e um gate proíbe a palavra.
//
// ## A timeline é dado, não opinião
//
// Ordem recebida é ordem exibida. Sem síntese, sem lacuna preenchida, sem duração calculada, sem
// tempo relativo. `analysis.completed` e `result.available` continuam dois eventos distintos.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import type { AnalysisTimelineView, TimelineEvent } from "@/lib/v1";
import { LinhaDoTempo } from "@/features/canonical-analysis/ui/analytics/LinhaDoTempo";
import {
  PainelDeProcedencia,
  type ZonaDeProcedencia,
} from "@/features/canonical-analysis/ui/analytics/PainelDeProcedencia";

const RAIZ = resolve(__dirname, "../../..");
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");
const PROC_TS = resolve(RAIZ, "src/features/canonical-analysis/result/procedencia.ts");
const TIMELINE_TSX = resolve(RAIZ, "src/features/canonical-analysis/ui/analytics/LinhaDoTempo.tsx");
const PAINEL_TSX = resolve(
  RAIZ,
  "src/features/canonical-analysis/ui/analytics/PainelDeProcedencia.tsx",
);

const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const R = pt.canonicalAnalysis.result;

const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

const base = {
  event_schema_version: "public-events-v1",
  analysis_id: "an-abc",
  workspace_id: "ws-1",
  occurred_at: "2026-07-31T10:00:00Z",
};
const ev = (id: string, tipo: TimelineEvent["event_type"], seq: number) =>
  ({ ...base, event_id: id, event_type: tipo, sequence: seq, data: {} }) as TimelineEvent;

const linha = (events: TimelineEvent[]): AnalysisTimelineView => ({ analysis_id: "an-abc", events });

const ZONAS: ZonaDeProcedencia[] = [
  {
    titulo: R.trustDocument,
    elementos: [
      { rotulo: R.provContractDoc, valor: "analysis-result-v2", campo: "result_schema_version" },
      { rotulo: R.provRegistryDoc, valor: null, campo: "indicator_registry_version" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Trust — origem apontável
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M28 · 1. cada elemento tem origem canônica apontável", () => {
  it("a linha imprime o valor E o campo de contrato", () => {
    montar(<PainelDeProcedencia zonas={ZONAS} />);
    expect(screen.getByText("analysis-result-v2")).toBeTruthy();
    expect(screen.getByText(`${R.trustSource}: result_schema_version`)).toBeTruthy();
  });

  it("valor ausente vira a palavra do produto — e a origem CONTINUA apontada", () => {
    montar(<PainelDeProcedencia zonas={ZONAS} />);
    expect(screen.getByText(R.provenanceAbsent)).toBeTruthy();
    // Não saber o valor não é não saber de onde ele viria.
    expect(screen.getByText(`${R.trustSource}: indicator_registry_version`)).toBeTruthy();
  });

  it("todo campo citado por `procedencia.ts` está na tabela §10 do Blueprint", () => {
    const fonte = semComentarios(readFileSync(PROC_TS, "utf-8"));
    const campos = [...fonte.matchAll(/campo:\s*"([a-z_.]+)"/g)].map((m) => m[1]);
    expect(campos.length, "âncora quebrada: nenhum campo lido").toBeGreaterThan(0);
    const secao = BLUEPRINT.slice(BLUEPRINT.indexOf("## 10. Trust"));
    for (const campo of campos) {
      // `analytics.x` é o mesmo `x` do §10, qualificado pelo bloco onde vive no documento.
      const nu = campo.replace(/^analytics\./, "");
      expect(secao, `campo sem linha no §10: ${campo}`).toContain(nu);
    }
  });

  it("NENHUM trust score — nem a palavra", () => {
    const fonte = semComentarios(readFileSync(PAINEL_TSX, "utf-8")) + semComentarios(readFileSync(PROC_TS, "utf-8"));
    expect(/\btrust[_ ]?score|\bconfianca|\bconfiança|\bnota\b|\bselo\b/i.test("trust_score")).toBe(true);
    expect(fonte).not.toMatch(/\btrust[_ ]?score|\bnota\b|\bselo\b/i);
  });

  it("digest NÃO vira julgamento — sem bom/ruim, válido/inválido", () => {
    const fonte = semComentarios(readFileSync(PAINEL_TSX, "utf-8"));
    expect(fonte).not.toMatch(/\b(v[aá]lido|inv[aá]lido|bom|ruim|ok|good|bad)\b/i);
  });

  it("é PAINEL, não cartão por campo — separação por borda, como o Linear", () => {
    const fonte = readFileSync(PAINEL_TSX, "utf-8");
    expect(fonte).toContain("border-l");
    // `bg-card` por elemento seria a pilha de caixas que a direção rejeita.
    expect(semComentarios(fonte)).not.toContain("bg-card");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Timeline — sequência, não feed
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M28 · 2. a linha do tempo", () => {
  it("exibe os eventos na ORDEM recebida — o front não reordena", () => {
    montar(
      <LinhaDoTempo
        vista={linha([
          ev("c", "result.available", 3),
          ev("a", "analysis.created", 1),
          ev("b", "analysis.completed", 2),
        ])}
      />,
    );
    // A 1ª versão usava `toContain("3")` no texto do item — e sobreviveu à mutação que ordena
    // por `sequence`, porque "2026-07-31T10:00:00Z" contém "3". A assertiva casava com o
    // timestamp, não com a sequência. Agora o rótulo é exato.
    const seq = (i: number) => `${R.timelineSeq} ${i}`;
    const itens = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(itens[0]).toContain(seq(3));
    expect(itens[1]).toContain(seq(1));
    expect(itens[2]).toContain(seq(2));
  });

  it("`analysis.completed` e `result.available` NÃO colapsam", () => {
    montar(
      <LinhaDoTempo vista={linha([ev("a", "analysis.completed", 1), ev("b", "result.available", 2)])} />,
    );
    const a = R.timelineEvent.analysis.completed;
    const b = R.timelineEvent.result.available;
    expect(a).not.toBe(b);
    expect(screen.getByText(a)).toBeTruthy();
    expect(screen.getByText(b)).toBeTruthy();
  });

  it("lista vazia é DECLARADA — nada de evento sintético", () => {
    montar(<LinhaDoTempo vista={linha([])} />);
    expect(screen.getByText(R.timelineEmpty)).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("`occurred_at` sai como veio — sem tempo relativo nem duração", () => {
    montar(<LinhaDoTempo vista={linha([ev("a", "analysis.created", 1)])} />);
    expect(screen.getByText("2026-07-31T10:00:00Z")).toBeTruthy();
    const fonte = semComentarios(readFileSync(TIMELINE_TSX, "utf-8"));
    for (const conta of ["Date.now", "new Date", "getTime", "duração", "duration", "há ", "ago"]) {
      expect(fonte, `cálculo temporal novo no Front: ${conta}`).not.toContain(conta);
    }
  });

  it("é sequência com régua, não pilha de cartões nem tabela", () => {
    // `border-l` também aparece no comentário que explica a régua: sem strippar, o cadeado media
    // a explicação e sobrevivia à remoção da régua de verdade. Terceira vez nesta série.
    const fonte = semComentarios(readFileSync(TIMELINE_TSX, "utf-8"));
    expect(fonte).toContain("border-l"); // a régua É a sequência
    expect(fonte).not.toContain("bg-card");
    expect(fonte).not.toMatch(/<table|<thead/);
  });

  it("`sequence` usa numeral tabular — coluna de número não treme (Grafana)", () => {
    const fonte = readFileSync(TIMELINE_TSX, "utf-8");
    expect(fonte).toContain("tabular-nums");
  });

  it("nenhum campo `nunca_publicos` é nomeado", () => {
    const fonte = semComentarios(readFileSync(TIMELINE_TSX, "utf-8"));
    for (const proibido of ["job_id", "lease_token", "worker_id", "object_key", "stack_trace", "engine_version"]) {
      expect(fonte, `campo nunca-público na timeline: ${proibido}`).not.toContain(proibido);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Motion — a decisão, e a prova de que ela foi cumprida
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M28 · 3. sem motion", () => {
  it("nem Trust nem Timeline animam — não há consumidor semântico", () => {
    for (const f of [PAINEL_TSX, TIMELINE_TSX]) {
      const fonte = semComentarios(readFileSync(f, "utf-8"));
      for (const m of ["transition", "animate-", "framer", "duration-"]) {
        expect(fonte, `motion sem consumidor semântico em ${f}: ${m}`).not.toContain(m);
      }
    }
  });
});
