// Leitores de folha do documento canônico — a inspeção campo a campo, sem `as` amplo.
//
// ## Por que existem aqui, e não dentro de cada validador
//
// `analysis-result-v1` e `analysis-result-v2` descrevem a MESMA parte da Engine: indicador,
// dimensão, recomendação e evidência têm forma idêntica nos dois. O que difere é o cabeçalho
// (`summary`) e o bloco analítico, que o v2 acrescenta.
//
// Duplicar estes leitores em `validatorV2.ts` criaria duas cópias da regra de coerência
// estado×valor — e a falha desse arranjo não é a duplicação, é o dia em que alguém corrige uma
// delas. O documento passaria a ser lido com dois critérios diferentes conforme a versão, que é
// exatamente o defeito que a validação existe para impedir.
//
// Extração MECÂNICA: as funções abaixo saíram de `validator.ts` sem alteração de comportamento.
// Os dois validadores permanecem distintos — eles é que decidem versão, cabeçalho e desfecho.

import {
  INDICATOR_KINDS,
  INDICATOR_STATES,
  STATES_COM_VALOR,
  type CanonicalDenominator,
  type CanonicalDimension,
  type CanonicalEvidenceSummary,
  type CanonicalIndicator,
  type CanonicalRecommendation,
  type IndicatorKind,
  type IndicatorState,
} from "./canonicalSchema";

export function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function numeroOuNulo(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function lerDenominador(bruto: unknown): CanonicalDenominator | null {
  if (!ehObjeto(bruto)) return null;
  const kind = textoOuNulo(bruto.kind);
  const value = numeroOuNulo(bruto.value);
  if (!kind || value === null) return null;
  return { kind, value };
}

/** Indicador válido ou `null` (descartado — nunca "consertado" com zero). */
export function lerIndicador(bruto: unknown): CanonicalIndicator | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  if (!id) return null;

  const kind = bruto.kind;
  if (typeof kind !== "string" || !INDICATOR_KINDS.includes(kind as IndicatorKind)) return null;
  const state = bruto.state;
  if (typeof state !== "string" || !INDICATOR_STATES.includes(state as IndicatorState)) return null;

  const value = numeroOuNulo(bruto.value);
  // Coerência declarada: estado COM valor exige número; estado sem valor exige `null`.
  // Um indicador que se diz `not_measured` carregando um número é internamente
  // inconsistente — e o pior desfecho seria escolher em qual dos dois acreditar.
  const temValor = STATES_COM_VALOR.includes(state as IndicatorState);
  if (temValor && value === null) return null;
  if (!temValor && value !== null) return null;

  const precisao = numeroOuNulo(bruto.display_precision);
  if (precisao === null || precisao < 0 || !Number.isInteger(precisao)) return null;

  return {
    id,
    kind: kind as IndicatorKind,
    state: state as IndicatorState,
    value,
    unit: textoOuNulo(bruto.unit),
    currency: textoOuNulo(bruto.currency),
    denominator: lerDenominador(bruto.denominator),
    coverage: numeroOuNulo(bruto.coverage),
    display_precision: precisao,
  };
}

export function lerRecomendacao(bruto: unknown): CanonicalRecommendation | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const title = textoOuNulo(bruto.title);
  // Local em português de propósito: `const priority = ...` é indistinguível, para um leitor
  // (e para o cadeado backend-first), de FABRICAR uma prioridade. Aqui ela é LIDA do documento.
  const prioridadeDaOrigem = textoOuNulo(bruto.priority);
  if (!id || !title || !prioridadeDaOrigem) return null;
  const refs = Array.isArray(bruto.evidence_refs)
    ? bruto.evidence_refs.filter((r): r is string => typeof r === "string")
    : [];
  return {
    id,
    title,
    priority: prioridadeDaOrigem,
    category: textoOuNulo(bruto.category),
    evidence_refs: refs,
  };
}

export function lerDimensao(bruto: unknown): CanonicalDimension | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const state = bruto.state;
  if (!id) return null;
  if (typeof state !== "string" || !INDICATOR_STATES.includes(state as IndicatorState)) return null;
  return {
    id,
    state: state as IndicatorState,
    value: numeroOuNulo(bruto.value),
    coverage: numeroOuNulo(bruto.coverage),
  };
}

export function lerEvidencia(bruto: unknown): CanonicalEvidenceSummary | null {
  if (!ehObjeto(bruto)) return null;
  const id = textoOuNulo(bruto.id);
  const kind = textoOuNulo(bruto.kind);
  const observed = numeroOuNulo(bruto.observed_count);
  if (!id || !kind || observed === null) return null;
  return { id, kind, label: textoOuNulo(bruto.label), observed_count: observed };
}

export function lista<T>(v: unknown, ler: (b: unknown) => T | null): T[] {
  return Array.isArray(v) ? v.map(ler).filter((x): x is T => x !== null) : [];
}

/**
 * Como `lista`, mas **tudo ou nada**: um elemento ilegível devolve `null` para a lista inteira.
 *
 * A diferença importa onde os elementos formam um TODO. Uma série temporal com uma janela
 * descartada continua sendo desenhada — só que sem aquele mês, e ninguém vê a ausência: o
 * gráfico mostra uma tendência que o documento não afirma. O mesmo vale para os grupos de uma
 * distribuição e para as faixas de uma concentração, onde a barra que sumiu era justamente a
 * informação.
 *
 * `lista` continua correta um nível acima, entre BLOCOS: cada bloco é um documento independente,
 * e perder um deles é perder um assunto, não deformar um.
 *
 * Campo ausente e lista vazia continuam sendo `[]` — ausência não é ilegibilidade.
 */
export function listaEstrita<T>(v: unknown, ler: (b: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return [];
  const saida: T[] = [];
  for (const item of v) {
    const lido = ler(item);
    if (lido === null) return null;
    saida.push(lido);
  }
  return saida;
}

/**
 * Parcialidade DECLARADA pela origem, ou `null` quando o bloco não corresponde ao contrato.
 *
 * `null` é recusa, não "completo": o chamador decide o desfecho. Devolver
 * `{complete: true, reasons: []}` aqui inventaria uma completude que o documento não afirmou.
 */
export function lerParcialidade(bruto: unknown): { complete: boolean; reasons: string[] } | null {
  if (!ehObjeto(bruto) || typeof bruto.complete !== "boolean") return null;
  const reasons = Array.isArray(bruto.reasons)
    ? bruto.reasons.filter((r): r is string => typeof r === "string")
    : [];
  return { complete: bruto.complete, reasons };
}
