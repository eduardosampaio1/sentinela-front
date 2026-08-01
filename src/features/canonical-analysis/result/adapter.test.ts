// Adapter do resultado canônico — o que ele PODE e o que ele NÃO PODE fazer.
//
// As massas não são inventadas: são a saída real do código analítico do `sentinela` montada
// pelo `sentinela-result-assembler`. Testar contra massa escrita à mão provaria só que o
// adapter concorda com a minha suposição do formato.

import { describe, expect, it } from "vitest";
import { adaptAnalysisResult } from "./adapter";
import { INDICATOR_DESCRIPTORS } from "./descriptors";
import {
  envelope,
  MASSA_A,
  MASSA_B,
  MASSA_C,
  MASSA_D_PARCIAL,
  MASSA_E_FORA_DE_FAIXA,
  PAYLOAD_SCHEMA_DESCONHECIDO,
} from "@/test/fixtures/canonical-result/massas";

function suportado(doc: unknown, versao?: string) {
  const r = adaptAnalysisResult(envelope(doc, versao));
  if (r.status !== "supported") throw new Error(`esperava supported, veio ${r.reason}`);
  return r.view;
}

function indicador(doc: unknown, id: string) {
  const item = suportado(doc).indicators.find((i) => i.id === id);
  if (!item) throw new Error(`indicador ausente na view: ${id}`);
  return item;
}

describe("resumo e procedência", () => {
  it("lê `record_count` e `analyzed_at` da origem, sem inventar nada", () => {
    const v = suportado(MASSA_A);
    expect(v.summary.recordCount).toBe(100);
    expect(v.summary.analyzedAt).toBe("2026-07-31T10:00:00Z");
  });

  it("carrega a versão do registro de indicadores junto do resultado", () => {
    // É ela, e não o schema, que explica um indicador que apareceu ou sumiu.
    expect(suportado(MASSA_A).indicatorRegistryVersion).toBe("indicator-registry-1.0");
  });
});

describe("apresentação por natureza do valor", () => {
  it("razão vira percentual — e SÓ porque a origem declarou `ratio`", () => {
    const i = indicador(MASSA_A, "useful_outcome_rate");
    expect(i.rawValue).toBe(0.8);
    expect(i.display).toBe("80");
    expect(i.unitSuffix).toBe("%");
  });

  it("contagem NUNCA vira percentual", () => {
    const i = indicador(MASSA_A, "analyzed_conversation_count");
    expect(i.rawValue).toBe(100);
    expect(i.display).toBe("100");
    expect(i.unitSuffix).toBeNull();
  });

  it("moeda usa o código declarado pela origem", () => {
    const i = indicador(MASSA_A, "total_estimated_cost");
    expect(i.rawValue).toBe(10);
    expect(i.display).toContain("10");
  });

  it("valor sub-centavo não colapsa em zero na exibição", () => {
    // Massa C: custo 0,000004 por registro. Exibir "0" aqui seria dizer que não custou nada.
    const i = indicador(MASSA_C, "cost_per_useful_outcome");
    expect(i.rawValue).toBeGreaterThan(0);
    expect(i.display).not.toMatch(/^[^1-9]*0$/);
  });

  it("a precisão vem da ORIGEM, não de uma tabela local", () => {
    // O descriptor não tem mais `precision`: se tivesse, haveria duas fontes para a mesma
    // decisão, e elas divergiriam.
    for (const d of Object.values(INDICATOR_DESCRIPTORS)) {
      expect(d).not.toHaveProperty("precision");
    }
  });
});

describe("ausência é ausência — nunca zero", () => {
  it("sem desfecho útil, o custo por desfecho útil é AUSENTE (não zero)", () => {
    const i = indicador(MASSA_B, "cost_per_useful_outcome");
    expect(i.state).toBe("not_measured");
    expect(i.rawValue).toBeNull();
    expect(i.display).toBeNull();
  });

  it("zero REAL continua sendo zero, e é distinguível da ausência", () => {
    const i = indicador(MASSA_B, "useful_outcome_rate");
    expect(i.state).toBe("measured");
    expect(i.rawValue).toBe(0);
    expect(i.display).toBe("0");
  });
});

describe("parcialidade vem DECLARADA, não inferida", () => {
  it("documento completo não é marcado como parcial", () => {
    expect(suportado(MASSA_A).partial).toBe(false);
  });

  it("a origem declara incompleto e o adapter respeita, com os motivos", () => {
    const v = suportado(MASSA_D_PARCIAL);
    expect(v.partial).toBe(true);
    expect(v.partialityReasons).toContain("indicator_unavailable");
  });

  it("a massa B é parcial porque o BACKEND disse, não porque o frontend contou", () => {
    // Prova que o sinal atravessa de ponta a ponta: a massa B saiu do Assembler já
    // incompleta (sem desfecho útil, o custo por desfecho não tem denominador) — e o
    // frontend recebeu TODOS os 14 indicadores, então contá-los não revelaria isso.
    const v = suportado(MASSA_B);
    expect(v.partial).toBe(true);
    expect(v.indicators).toHaveLength(14);
  });
});

describe("cadeado de vocabulário", () => {
  it("indicador sem descriptor não vira UI adivinhada — mas também não some calado", () => {
    const comEstranho = {
      ...MASSA_A,
      indicators: [
        ...MASSA_A.indicators,
        {
          id: "metrica_que_a_ui_nao_conhece",
          state: "measured",
          value: 1,
          kind: "count",
          unit: null,
          currency: null,
          denominator: null,
          coverage: null,
          display_precision: 0,
        },
      ],
    };
    const v = suportado(comEstranho);
    expect(v.indicators.map((i) => i.id)).not.toContain("metrica_que_a_ui_nao_conhece");
    expect(v.unsupportedIndicatorIds).toContain("metrica_que_a_ui_nao_conhece");
  });

  it("todo indicador da massa real tem descriptor (registro e UI casados)", () => {
    // Se o backend produz 14 e a UI só sabe nomear 7, metade da análise vira invisível.
    expect(suportado(MASSA_A).unsupportedIndicatorIds).toEqual([]);
    expect(suportado(MASSA_A).indicators).toHaveLength(14);
  });
});

describe("valor fora da faixa declarada", () => {
  it("é SINALIZADO, nunca limitado em silêncio", () => {
    const i = indicador(MASSA_E_FORA_DE_FAIXA, "useful_outcome_rate");
    expect(i.outOfRange).toBe(true);
    expect(i.rawValue).toBe(1.4); // preservado: limitar esconderia o defeito da origem
  });
});

describe("versão do contrato é a AUTORIDADE", () => {
  it("versão desconhecida → unsupported, sem tentar renderizar", () => {
    const r = adaptAnalysisResult(envelope(MASSA_A, "analysis-result-v99"));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("unknown_schema");
  });

  it("versão ausente → unsupported", () => {
    const r = adaptAnalysisResult(envelope(MASSA_A, ""));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("missing_schema");
  });

  it("documento de outra versão NÃO é resgatado por marcador interno", () => {
    const r = adaptAnalysisResult(envelope(PAYLOAD_SCHEMA_DESCONHECIDO));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("schema_mismatch");
  });

  it("documento sem `summary` não é `analysis-result-v1`", () => {
    const { summary: _s, ...semSumario } = MASSA_A;
    const r = adaptAnalysisResult(envelope(semSumario));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("malformed");
  });

  it("documento sem `partiality` não é `analysis-result-v1`", () => {
    // Fabricar `complete: true` aqui afirmaria completude que ninguém declarou.
    const { partiality: _p, ...semParcialidade } = MASSA_A;
    const r = adaptAnalysisResult(envelope(semParcialidade));
    expect(r.status).toBe("unsupported");
    if (r.status === "unsupported") expect(r.reason).toBe("malformed");
  });
});

describe("coerência interna do indicador", () => {
  it("estado sem valor carregando número é descartado", () => {
    // Escolher em qual dos dois acreditar seria pior que descartar.
    const incoerente = {
      ...MASSA_A,
      indicators: [{ ...MASSA_A.indicators[0], state: "not_measured", value: 0.8 }],
    };
    expect(suportado(incoerente).indicators).toHaveLength(0);
  });

  it("estado COM valor sem número é descartado", () => {
    const incoerente = {
      ...MASSA_A,
      indicators: [{ ...MASSA_A.indicators[0], state: "measured", value: null }],
    };
    expect(suportado(incoerente).indicators).toHaveLength(0);
  });
});

describe("recomendação atravessa sem ser reordenada nem reclassificada", () => {
  // Esta é a camada que o cadeado por grep NÃO consegue dar: ele não distingue transportar
  // de fabricar quando o valor vem de uma variável. Aqui a prova é por COMPORTAMENTO —
  // o que sai tem de ser byte a byte o que entrou, na mesma ordem.
  it("a ordem recebida é preservada", () => {
    const v = suportado(MASSA_A);
    expect(v.recommendations.map((r) => r.id)).toEqual(
      MASSA_A.recommendations.map((r: { id: string }) => r.id),
    );
  });

  it("a prioridade que SAI é exatamente a que ENTROU", () => {
    const v = suportado(MASSA_A);
    const daOrigem = new Map(
      MASSA_A.recommendations.map((r: { id: string; priority: string }) => [r.id, r.priority]),
    );
    expect(v.recommendations.length).toBeGreaterThan(0);
    for (const r of v.recommendations) {
      expect(r.priority, `prioridade de ${r.id} divergiu da origem`).toBe(daOrigem.get(r.id));
    }
  });

  it("inverter a prioridade na ORIGEM inverte na saída (o adapter não decide nada)", () => {
    // Se o adapter reclassificasse, a saída seria a mesma nos dois casos.
    const invertida = {
      ...MASSA_A,
      recommendations: MASSA_A.recommendations.map(
        (r: { priority: string }, i: number) => ({ ...r, priority: i === 0 ? "P9" : "P0" }),
      ),
    };
    const v = suportado(invertida);
    expect(v.recommendations[0].priority).toBe("P9");
    expect(v.recommendations[1].priority).toBe("P0");
  });
});

describe("o adapter é puro", () => {
  it("a mesma entrada produz a mesma saída", () => {
    expect(suportado(MASSA_A)).toEqual(suportado(MASSA_A));
  });

  it("não gera timestamp local — a data vem do backend", () => {
    expect(suportado(MASSA_A).summary.analyzedAt).toBe(MASSA_A.summary.analyzed_at);
  });
});
