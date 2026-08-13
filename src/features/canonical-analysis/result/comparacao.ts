// M30 — parear duas análises. Puro, e o que ele NÃO faz é o conteúdo da missão.
//
// ## Comparabilidade é pré-condição, não detalhe
//
// D26 (Product Freeze): *"Quebra de versão quebra a comparabilidade numérica. Mudou
// `indicator_registry_version` ou `measure_schema`: **não conectar valores como mesma série**.
// Descontinuidade explícita… **Nunca** representar como aumento ou queda."*
//
// A quebra é de DOCUMENTO, não de linha: se o vocabulário de indicadores mudou, nenhum par é
// comparável, mesmo que um `id` exista dos dois lados com o mesmo nome. `useful_outcome_rate` no
// registro 1.0 e no 2.0 podem ser fórmulas diferentes com a mesma etiqueta — e é exatamente esse
// o caso que um delta esconderia.
//
// ## Nenhum número é calculado aqui
//
// O `ComparisonRow` da M13 diz, na própria assinatura: *"Texto pronto, com sinal e unidade. O
// Front não calcula variação."* Nada no `analysis-result-v1/v2` publica delta entre duas
// análises, então `delta` é `null` — sempre, hoje. Inventar uma diferença absoluta ou um
// percentual seria produzir um número que contrato nenhum sustenta, e ele apareceria na tela com
// a mesma autoridade dos que foram medidos.
//
// ## Identidade, e só identidade
//
// O pareamento é por `indicator.id` — o id público do registro canônico. Nunca por rótulo
// traduzido (que muda com o idioma), nunca por posição (que muda com a ordem do documento),
// nunca por descrição. Casar por texto faria dois indicadores diferentes virarem série no dia em
// que alguém ajustasse uma tradução.
//
// ## Delta não é Drift
//
// Um valor mudou entre duas análises não é o Sentinela ter detectado Drift. Drift é do motor,
// tem definição própria e não chega ao documento público. Aqui não existe tendência, melhora,
// piora nem degradação: existem dois valores e a informação de se eles pertencem à mesma série.

import type { IndicatorView } from "./indicadores";

export interface LinhaDeComparacao {
  /** `indicator.id` — a identidade canônica, e a única chave de pareamento. */
  readonly id: string;
  readonly descriptor: IndicatorView["descriptor"];
  /** Já formatado pelo adapter. `null` é AUSÊNCIA — do indicador ou do valor —, nunca zero. */
  readonly antes: string | null;
  readonly depois: string | null;
  /** `true` quando os dois pontos pertencem à mesma série. */
  readonly comparavel: boolean;
}

export interface Comparacao {
  /** `false` quando o vocabulário mudou: NENHUMA linha é comparável. */
  readonly comparavel: boolean;
  readonly linhas: readonly LinhaDeComparacao[];
}

/**
 * Pareia por identidade e declara comparabilidade. Não ordena por variação — não há variação.
 *
 * A ordem é a do documento ATUAL, com o que só existe na anterior no fim: inventar uma ordem por
 * "quanto mudou" exigiria calcular o quanto, que é justamente o que não se faz.
 */
export function compararComAnterior(
  atual: { indicators: readonly IndicatorView[]; indicatorRegistryVersion: string },
  anterior: { indicators: readonly IndicatorView[]; indicatorRegistryVersion: string } | null,
): Comparacao | null {
  if (!anterior) return null;

  const comparavel = atual.indicatorRegistryVersion === anterior.indicatorRegistryVersion;
  const porId = new Map(anterior.indicators.map((i) => [i.id, i]));
  const linhas: LinhaDeComparacao[] = [];

  for (const i of atual.indicators) {
    const par = porId.get(i.id);
    porId.delete(i.id);
    linhas.push({
      id: i.id,
      descriptor: i.descriptor,
      antes: par?.display ?? null,
      depois: i.display,
      comparavel,
    });
  }

  // O que existia antes e sumiu continua visível: um indicador que desapareceu é informação, e
  // omiti-lo faria a análise parecer ter os mesmos indicadores de sempre.
  for (const restante of porId.values()) {
    linhas.push({
      id: restante.id,
      descriptor: restante.descriptor,
      antes: restante.display,
      depois: null,
      comparavel,
    });
  }

  return { comparavel, linhas };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// M39 · EVO-02 — a comparação ARGOS A×B, sobre `analysis-result-v3`
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// A função acima serve a RES-01 ("esta análise vs. a imediatamente anterior") e continua como
// está: outra superfície, outra autoridade (D29), outro documento. O que nasce aqui é a EVO-02.
//
// ## Coordenador, não framework
//
// Duas famílias autorizadas, e a estrutura é a mais simples que as sustenta:
//
//     compatibilidade do DOCUMENTO  →  pares de indicador  →  pares de dimensão
//
// Nenhuma abstração para as outras nove. Elas não estão autorizadas, e construir o encaixe
// delas agora seria decidir, no escuro, uma semântica que a discovery deixou aberta de
// propósito. A catraca (`familiasDaComparacao.ts`) recusa a expansão sem autoridade.
//
// ## A/B são POSIÇÕES
//
// A ordem vem da URL. Não há "anterior", "atual", "antes" nem "depois": a rota não publica
// tempo, e inferi-lo seria inventar. Por isso os campos se chamam `a` e `b`.
//
// ## Nada é calculado
//
// Não há subtração, percentual, direção nem tendência. O que a comparação produz é o
// PAREAMENTO e o veredito de comparabilidade — os valores são os que o produtor publicou.

import type {
  AnalysisResultV3Document,
  PublicIndicatorV3,
  PublicMeasurement,
} from "./contratoV3";
import { PRECONDICOES_DE_DOCUMENTO } from "./familiasDaComparacao";

/** Por que um par não é comparável. Fechado: motivo novo entra por decisão, nunca por `default`. */
export type MotivoDoPar = "escala" | "unidade" | "moeda" | "sem_valor";

export type EstadoDoPar = "comparavel" | "incompativel" | "so_em_a" | "so_em_b";

/** Uma medição de qualquer das duas famílias, na forma que a apresentação consome. */
export type MedicaoComparada = PublicIndicatorV3 | PublicMeasurement;

export interface ParArgos {
  readonly id: string;
  readonly a: MedicaoComparada | null;
  readonly b: MedicaoComparada | null;
  readonly estado: EstadoDoPar;
  /** Preenchido só em `incompativel`. Motivo tipado, para a tela dizer POR QUE não compara. */
  readonly motivo: MotivoDoPar | null;
}

export interface ComparacaoArgos {
  /** `false` quando D26 quebrou: NENHUM par é apresentado como comparável. */
  readonly documentosComparaveis: boolean;
  /** O campo de documento que divergiu. `null` quando os documentos são compatíveis. */
  readonly campoQueQuebrou: string | null;
  readonly indicadores: readonly ParArgos[];
  readonly dimensoes: readonly ParArgos[];
}

function valorPresente(m: MedicaoComparada): boolean {
  return m.value !== null && m.value !== undefined;
}

/** A moeda existe só no indicador; a medição de dimensão não a declara. */
function moedaDe(m: MedicaoComparada): string | null {
  return "currency" in m ? (m.currency ?? null) : null;
}

/**
 * Por que este par não compara — ou `null` quando ele compara.
 *
 * A ordem das checagens é a da gravidade: escala primeiro, porque duas medições em réguas
 * diferentes não são o mesmo número medido duas vezes. Nada aqui converte: `ratio_unit` e
 * `score_100` são incompatíveis, não convertíveis, e transformar um no outro produziria um
 * número que produtor nenhum publicou.
 */
function motivoDaIncompatibilidade(
  a: MedicaoComparada,
  b: MedicaoComparada,
): MotivoDoPar | null {
  if (a.scale.kind !== b.scale.kind) return "escala";
  if ((a.unit ?? null) !== (b.unit ?? null)) return "unidade";
  if (moedaDe(a) !== moedaDe(b)) return "moeda";
  // Valor ausente de um dos lados NÃO é incompatibilidade de metadado — é ausência. Mas também
  // não é comparação: pôr 0,8 ao lado de "não medido" e chamar de par sugeriria que os dois são
  // leituras da mesma coisa. A tela mostra os dois estados; o par não se declara comparável.
  if (!valorPresente(a) || !valorPresente(b)) return "sem_valor";
  return null;
}

function parear(
  ladoA: readonly MedicaoComparada[],
  ladoB: readonly MedicaoComparada[],
): readonly ParArgos[] {
  const porIdB = new Map(ladoB.map((m) => [m.id, m]));
  const pares: ParArgos[] = [];

  for (const a of ladoA) {
    const b = porIdB.get(a.id);
    porIdB.delete(a.id);
    if (!b) {
      pares.push({ id: a.id, a, b: null, estado: "so_em_a", motivo: null });
      continue;
    }
    const motivo = motivoDaIncompatibilidade(a, b);
    pares.push({
      id: a.id,
      a,
      b,
      estado: motivo === null ? "comparavel" : "incompativel",
      motivo,
    });
  }

  // O que existe só em B continua visível: uma medição que apareceu de um lado é informação, e
  // omiti-la faria as duas análises parecerem ter exatamente o mesmo conjunto.
  for (const b of porIdB.values()) {
    pares.push({ id: b.id, a: null, b, estado: "so_em_b", motivo: null });
  }

  return pares;
}

/**
 * O documento inteiro é comparável? D26, e ela vale para o DOCUMENTO — nunca por linha.
 *
 * Devolve o campo que divergiu, porque "não comparável" sem dizer o quê manda a pessoa
 * adivinhar. Se mais de um divergir, o primeiro da lista canônica basta: a conclusão é a mesma,
 * e enumerar todos daria a impressão de que o número deles importa.
 */
function documentoQueQuebrou(
  a: AnalysisResultV3Document,
  b: AnalysisResultV3Document,
): string | null {
  const leitura = (d: AnalysisResultV3Document, campo: string): string =>
    String((d as unknown as Record<string, unknown>)[campo] ?? "");
  for (const campo of PRECONDICOES_DE_DOCUMENTO) {
    if (leitura(a, campo) !== leitura(b, campo)) return campo;
  }
  return null;
}

/**
 * A comparação ARGOS de duas análises.
 *
 * Quando o documento quebra (D26), os pares **não são montados**: apresentar linhas com um
 * carimbo de "incomparável" convidaria a lê-las mesmo assim, e a descontinuidade é sobre o
 * documento, não sobre cada linha. A tela mostra o estado, não uma tabela.
 */
export function compararArgos(
  a: AnalysisResultV3Document,
  b: AnalysisResultV3Document,
): ComparacaoArgos {
  const campoQueQuebrou = documentoQueQuebrou(a, b);
  if (campoQueQuebrou !== null) {
    return { documentosComparaveis: false, campoQueQuebrou, indicadores: [], dimensoes: [] };
  }
  return {
    documentosComparaveis: true,
    campoQueQuebrou: null,
    indicadores: parear(a.indicators ?? [], b.indicators ?? []),
    dimensoes: parear(a.dimensions ?? [], b.dimensions ?? []),
  };
}
