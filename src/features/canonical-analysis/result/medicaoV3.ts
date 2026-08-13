// F3 — como uma `PublicMeasurement` do v3 vira texto. **Só isso.**
//
// A regra da plataforma é backend-first: todo número exibido foi decidido no backend. O que
// sobra para cá é escrever o número — separador, casas, símbolo de moeda — e dizer o que o
// produtor declarou sobre ele.
//
// ## O que este módulo NÃO faz, e por que cada proibição existe
//
// **Não converte escala.** `response_stability` sai `0..100` e é publicado assim; `scale.kind`
// é contrato. Dividir por 100 "para virar razão" mudaria o número que o produtor mediu.
//
// **Não transforma ausência em zero.** `value: null` com `state: not_measured` é "não sabemos".
// Escrever `0` ali faz custo desconhecido e custo zero virarem a mesma tela — e decisões
// opostas para quem decide.
//
// **Não infere estado a partir do valor.** `availability` e `state` vêm do produtor. Um valor
// presente com `availability: partial` continua parcial, e um `reason` acompanha dizendo por quê.
//
// **Não inventa faixa.** Se `band` não veio no risco, não existe threshold local que a produza.

import type {
  PublicIndicatorV3,
  PublicMeasurement,
  Reason,
  Scale,
} from "@/lib/v1/contract/public-v3.types";
import { formatarMoeda, formatarNumero, formatarPercentual } from "./formatacao";

/** Casas decimais quando o indicador não declara `display_precision`. */
const CASAS_PADRAO = 2;

/**
 * O valor escrito, ou `null` quando não há valor.
 *
 * `null` é a resposta honesta e é o que a interface usa para escolher entre mostrar número e
 * mostrar ausência. Devolver `"—"` daqui misturaria dado com apresentação e faria toda chamada
 * ter de reconhecer o travessão como "vazio".
 */
export function valorEscrito(
  medicao: Pick<PublicMeasurement, "value" | "scale" | "unit"> & { currency?: string | null },
  locale: string,
  casas = CASAS_PADRAO,
): string | null {
  const { value, scale } = medicao;
  if (value === null || value === undefined) return null;

  switch (scale.kind) {
    case "currency":
      // Sem moeda declarada não se escolhe símbolo. O produtor recusa publicar dinheiro medido
      // sem moeda; se mesmo assim chegar, escrever o número cru é melhor que inventar a divisa.
      return medicao.currency
        ? formatarMoeda(value, medicao.currency, locale, casas)
        : formatarNumero(value, locale, casas);
    case "ratio_unit":
      // Percentual é ESCRITA de uma razão que o produtor declarou como razão — não conversão.
      return formatarPercentual(value, locale);
    case "percent":
      // Já vem em pontos percentuais. Multiplicar de novo daria 8500%.
      return `${formatarNumero(value, locale, casas)}%`;
    case "score_100":
    case "count":
    case "duration":
    case "raw":
    default:
      return formatarNumero(value, locale, casas);
  }
}

/** A escala, escrita para quem precisa saber em que régua o número vive. */
export function escalaEscrita(scale: Scale, locale: string): string | null {
  const { minimum, maximum } = scale;
  if (minimum === null || minimum === undefined) return null;
  if (maximum === null || maximum === undefined) return null;
  return `${formatarNumero(minimum, locale, 0)}–${formatarNumero(maximum, locale, 0)}`;
}

/** Há valor apresentável? Nunca inferido do estado — lido do próprio valor. */
export function temValor(m: Pick<PublicMeasurement, "value">): boolean {
  return m.value !== null && m.value !== undefined;
}

/**
 * O `reason` merece ser mostrado?
 *
 * `ok` é ruído: ele diz "medimos por inteiro", que o valor presente já diz. Todos os outros são
 * o que o v1 retinha e o que transforma "não medido" — que não diz o que fazer — em
 * "dependência indisponível", que diz.
 */
export function motivoRelevante(reason: Reason): boolean {
  return reason !== "ok";
}

/**
 * A medição está completa, ressalvada ou ausente?
 *
 * Três estados de APRESENTAÇÃO, derivados do que o produtor declarou — nunca do valor. É esta
 * função que impede a interface de tratar `partial` como completo só porque veio número.
 */
export type Apresentacao = "completa" | "ressalvada" | "ausente";

export function apresentacaoDaMedicao(m: PublicMeasurement): Apresentacao {
  if (!temValor(m)) return "ausente";
  return m.availability === "available" ? "completa" : "ressalvada";
}

export function apresentacaoDoIndicador(i: PublicIndicatorV3): Apresentacao {
  if (!temValor(i)) return "ausente";
  return i.state === "measured" ? "completa" : "ressalvada";
}

/*
 * NÃO existe aqui função que devolva CHAVE de i18n.
 *
 * Uma `chaveDoEstado(state)` levaria a interface a `t(chaveDoEstado(x))` — uma chamada OPACA, que
 * não carrega chave nenhuma no texto do programa. A catraca M14 congela essas chamadas em nove e
 * exige o número exato: cada nova torna a orfandade de tradução ainda menos decidível.
 *
 * Foi assim que a `ComparacaoComAnterior` quebrou a catraca na M39 — recebia `tituloKey` e
 * chamava `t(variavel)`. A correção foi a mesma que vale aqui: quem monta a chave usa template
 * com prefixo estático (`t(`canonicalAnalysis.argos.state.${x}`)`), e quem apresenta recebe
 * TEXTO já resolvido.
 */

/** Cobertura escrita, quando o produtor a publicou. `null` é ausência, nunca 100%. */
export function coberturaEscrita(
  cobertura: number | null | undefined,
  locale: string,
): string | null {
  if (cobertura === null || cobertura === undefined) return null;
  return formatarPercentual(cobertura, locale);
}
