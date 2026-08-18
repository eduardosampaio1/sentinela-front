// As PORTAS do Diagnóstico — o eixo de LEITURA sobre as saídas do ARGOS.
//
// ## Isto reverte uma decisão escrita, e a razão é medida
//
// `Portas.tsx` argumentava "quatro portas, não três": o protótipo agrupava editorialmente, o
// contrato publica `domain` com vocabulário fechado de quatro valores, "e é esse o eixo real".
// O argumento sobre PROCEDÊNCIA continua certo — `domain` é publicado, a porta não é.
//
// O que ele não mediu foi o ALCANCE. `assemble_v3._dominio_de` só classifica as quatro
// dimensões de saúde, e o comentário dele diz por quê: *"inventar um domínio para
// `useful_outcome_rate` seria afirmar uma classificação que ninguém fez"*. Medido no catálogo:
// **4 das 39 saídas têm `domain`; 33 saem `null`.** A tela anuncia isso em voz alta —
// *"31 publicados sem domínio declarado, e aparecem aqui na Visão geral"*.
//
// Então o eixo publicado classifica 10% e joga o resto num balde. Um eixo de leitura que
// classifica tudo não compete com ele: **os dois coexistem, e nenhum vira o outro.**
//
// - `domain` continua sendo a procedência semântica das quatro dimensões, publicada e exibida.
// - A porta é agrupamento EDITORIAL sobre o que o contrato deixa `null` de propósito.
// - **A porta NUNCA é escrita em `domain`.** Um teste reprova quem tentar: seria transformar
//   decisão de tela em classificação do produtor, que é exatamente o que `_dominio_de` recusa.
//
// ## Por que a declaração é literal, e não uma regra
//
// A tentação era derivar a porta da família (`scores` → qualidade, `projections` → economia).
// Seria errado em dois lugares que importam: `global_confidence` é um escore e pertence a
// *Cobertura*, e `cost_per_useful_outcome` é indicador e é a âncora de *Economia*. Regra que
// erra dois casos precisa de duas exceções, e aí ela já é uma tabela pior escrita.
//
// A tabela é conferida contra o catálogo: id sem porta é ÓRFÃO e o gate reprova. Foi assim que
// as cinco saídas que a D5 do inventário oficializou apareceram — o protótipo mapeava 34 vagas
// sobre um catálogo que virou 39, e métrica órfã numa reorganização se perde exatamente como se
// perdia na lista.

import { OUTPUTS_DO_CATALOGO } from "./catalogoArgos";
import { INDICATOR_DESCRIPTORS } from "./descriptors";

/** As três portas. A Visão geral NÃO é uma delas — é a ausência do parâmetro. */
export const PORTAS = ["qualidade", "economia", "cobertura"] as const;
export type Porta = (typeof PORTAS)[number];

/** O parâmetro na URL. Mesmo mecanismo do `?dominio=`, que já provou deep link e histórico. */
export const PARAM_PORTA = "porta";

/**
 * Hierarquia de leitura. NÃO é importância publicada — o produtor não publica ranking.
 *
 * É decisão editorial declarada, e é por isso que ela mora numa tabela conferível em vez de
 * numa heurística: "os três primeiros do documento" era a regra anterior, e ela fazia a ordem de
 * montagem virar hierarquia de produto sem ninguém ter decidido isso.
 *
 * `P0` é o herói. `P1` responde a pergunta da porta. `P2` sustenta. `P3` é contexto.
 */
export const PRIORIDADES = ["P0", "P1", "P2", "P3"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export interface Destino {
  /** Onde a saída aparece. Mais de uma porta é repetição DELIBERADA (ver `REPETIDAS`). */
  readonly portas: readonly Porta[];
  /** Aparece na Visão geral, ao lado do herói? */
  readonly noResumo: boolean;
  readonly prioridade: Prioridade;
}

const d = (portas: readonly Porta[], prioridade: Prioridade, noResumo = false): Destino => ({
  portas,
  prioridade,
  noResumo,
});

/**
 * A tabela. `public_id` do catálogo → porta(s) e prioridade.
 *
 * ## Os *counts* nunca passam de `P2`
 *
 * Regra do owner: *"counts devem funcionar como contexto/explicação dos rates e custos, não
 * competir necessariamente como KPIs de mesma hierarquia"*. Um teste afirma isso sobre a tabela
 * inteira, então a regra não depende de eu lembrar dela ao acrescentar a próxima saída.
 *
 * ## As quatro que aparecem em dois lugares
 *
 * `behavior_score`, `semantic_drift`, `cost_per_useful_outcome`, `global_confidence` e
 * `intent_coverage_rate` repetem — quatro no resumo mais uma entre portas. Não é duplicação:
 * a mesma medida responde perguntas diferentes em lugares diferentes, e o herói existe
 * justamente para ser a resposta antes do detalhe.
 */
export const DESTINO: Readonly<Record<string, Destino>> = {
  // ── a resposta: herói e satélites da Visão geral ──────────────────────────────────────
  behavior_score: d([], "P0", true),
  semantic_drift: d(["qualidade"], "P1", true),
  cost_per_useful_outcome: d(["economia"], "P1", true),
  global_confidence: d(["cobertura"], "P1", true),

  // ── Qualidade & Comportamento ────────────────────────────────────────────────────────
  ai_health_score: d(["qualidade"], "P1"),
  consistency_score: d(["qualidade"], "P2"),
  // As QUATRO dimensões de saúde. O id delas É o valor de `domain` — é o único ponto em que
  // as duas taxonomias se tocam, e mesmo aqui a porta não sobrescreve o domínio publicado.
  semantic: d(["qualidade"], "P1"),
  behavioral: d(["qualidade"], "P1"),
  structural: d(["qualidade"], "P1"),
  economic: d(["economia"], "P1"),
  response_stability: d(["qualidade"], "P2"),
  intent_score: d(["qualidade"], "P2"),
  intent_coverage_rate: d(["qualidade", "cobertura"], "P2"),
  cross_intent_similarity: d(["qualidade"], "P3"),
  mean_response_variance_per_intent: d(["qualidade"], "P3"),

  // ── Economia & Eficiência ────────────────────────────────────────────────────────────
  useful_outcome_rate: d(["economia"], "P2"),
  conversion_rate: d(["economia"], "P2"),
  cost_per_session: d(["economia"], "P2"),
  total_estimated_cost: d(["economia"], "P2"),
  token_cost_total: d(["economia"], "P2"),
  handoff_cost_total: d(["economia"], "P2"),
  containment_risk: d(["economia"], "P2"),
  conversion_risk: d(["economia"], "P2"),
  useful_outcome_count: d(["economia"], "P3"),
  conversion_count: d(["economia"], "P3"),
  handoff_count: d(["economia"], "P3"),
  estimated_handoff_cost: d(["economia"], "P3"),
  // As projeções chegam com o horizonte no id (`…@month`). `portaDe` corta no `@` — o horizonte
  // é dimensão do MESMO output, não output diferente, e dar porta a cada um duplicaria a
  // tabela para dizer duas vezes a mesma coisa.
  projected_token_cost: d(["economia"], "P3"),
  projected_handoff_cost: d(["economia"], "P3"),

  // ── Cobertura & Evidência ────────────────────────────────────────────────────────────
  outcome_field_coverage_rate: d(["cobertura"], "P2"),
  critical_alert_count: d(["cobertura"], "P2"),
  analyzed_conversation_count: d(["cobertura"], "P3"),
  intents_detected_count: d(["cobertura"], "P3"),
  covered_intents_count: d(["cobertura"], "P3"),
  min_samples_per_intent: d(["cobertura"], "P3"),
};

/**
 * As BLOQUEADAS. Não têm porta porque não são publicadas — e ficam nomeadas de propósito.
 *
 * Sem esta lista, o gate de órfãs não saberia distinguir "esqueci de mapear" de "o owner
 * bloqueou", e a diferença é o que impede um bloqueio de virar esquecimento silencioso.
 */
export const BLOQUEADAS: readonly string[] = ["token_waste", "token_waste_cost"];

/**
 * A porta de uma saída. `null` quando o id não está na tabela.
 *
 * `null` NÃO é erro nem sumiço: quem chama mostra o item na Visão geral com o id cru, que é a
 * mesma degradação honesta que o rótulo já usa para output novo. Esconder seria pior — a saída
 * existiria no documento e não na tela.
 */
export function destinoDe(publicId: string): Destino | null {
  // O horizonte não muda a porta: `projected_token_cost@month` é o mesmo output.
  const base = publicId.split("@")[0] as string;
  return DESTINO[base] ?? null;
}

/** A porta pedida pela URL, ou `null` para a Visão geral — a AUSÊNCIA do parâmetro. */
export function portaDaUrl(busca: string): Porta | null {
  const pedido = new URLSearchParams(busca).get(PARAM_PORTA);
  return PORTAS.find((p) => p === pedido) ?? null;
}

/** Esta saída aparece nesta porta? */
export function pertenceA(publicId: string, porta: Porta): boolean {
  return destinoDe(publicId)?.portas.includes(porta) ?? false;
}

/**
 * Todo id que o FRONT sabe nomear. É o universo sobre o qual o gate de órfãs julga.
 *
 * Não é o catálogo inteiro: o front carrega cópia parcial (os 14 descriptors mais os 15 do
 * catálogo, mais as quatro dimensões). O gate afirma essa distância em número, para que ela seja
 * um fato conhecido em vez de uma surpresa — e para que crescer a cópia obrigue a rever a tabela.
 */
export const NOMEAVEIS: readonly string[] = [
  ...new Set([
    ...Object.keys(INDICATOR_DESCRIPTORS),
    ...OUTPUTS_DO_CATALOGO,
    // As quatro dimensões de saúde. O id delas é o próprio valor de `domain`.
    "semantic",
    "behavioral",
    "structural",
    "economic",
    // Publicados e EXIBIDOS, mas nomeados pela superfície que os desenha em vez de por um dos
    // dois registros acima. O gate encontrou os dois: eles tinham porta e não estavam aqui, e
    // "está na tabela e não no universo" é o mesmo defeito que órfã, só de costas.
    //
    // `intent_score` mora dentro de `intents[].score` e é rotulado por `Intencoes.tsx`;
    // `min_samples_per_intent` é PARÂMETRO do método, e por isso vive no bloco `method` em vez
    // de virar cartão — publicá-lo como indicador o faria parecer algo que a amostra revelou.
    "intent_score",
    "min_samples_per_intent",
  ]),
];
