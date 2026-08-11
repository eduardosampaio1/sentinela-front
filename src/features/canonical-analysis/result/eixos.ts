// M34 — os quatro eixos de progresso de AN-03, lidos sem agregação.
//
// Módulo PURO sobre `GET /v1/analyses/{id}/progress`. Não busca, não recalcula, não ordena por
// conveniência e não resume. O tipo do contrato é explícito sobre o porquê:
//
//   *"**Não há percentual, e não haverá.** … um número único inventaria uma média entre eixos que
//   medem coisas incomparáveis, e a pessoa leria '63%' como se fosse uma medida quando é uma
//   opinião do front."*
//
// Por isso aqui não existe contagem de eixos prontos, etapa global, nem "quantos faltam".
//
// ## Os quatro vocabulários são diferentes, de propósito
//
// `withheld` só existe em `analytics` — retenção por privacidade não acontece na Engine. `expired`
// e `unavailable` só existem em `export`. `partial` só existe em `analytics`, porque a Engine
// termina ou falha e não entrega metade. Este módulo **não** normaliza os quatro num vocabulário
// comum: fazer isso aceitaria `expired` num eixo que nunca expira.
//
// ## `recovering` não mora aqui
//
// Ele é **status da análise**, não estado de eixo — está em `AnalysisStatus`, ao lado de `queued` e
// `running`. A superfície mostra as duas coisas ao mesmo tempo: o status público diz o que
// acontece com a análise, e os eixos dizem o que já está disponível. Confundi-los faria
// "recuperando" parecer um quinto componente.

import type {
  AnalysisProgressView,
  AnalyticsAxisState,
  ProgressAxis,
  ProgressEntry,
} from "@/lib/v1";

/**
 * A ordem publicada. É a mesma de `ProgressAxis` no contrato, e não uma preferência de leitura:
 * reordenar por "o que parece mais importante" seria a tela decidindo prioridade entre
 * componentes que o produtor lista lado a lado.
 */
export const EIXOS_PUBLICADOS: readonly ProgressAxis[] = [
  "engine",
  "analytics",
  "export",
  "final_result",
] as const;

export interface EixoLido {
  axis: ProgressAxis;
  /**
   * A entrada publicada para este eixo, ou `null` quando o produtor **não a publicou**.
   *
   * Ausência não é `pending`. `pending` é um estado que alguém afirmou; ausência é a falta da
   * afirmação, e transformá-la em "aguardando" inventaria uma promessa de que aquele componente
   * ainda vai acontecer.
   */
  entrada: ProgressEntry | null;
}

/** Os quatro eixos, sempre os quatro, na ordem do contrato. */
export function lerEixos(vista: AnalysisProgressView | undefined): readonly EixoLido[] {
  const porEixo = new Map<ProgressAxis, ProgressEntry>();
  for (const e of vista?.axes ?? []) {
    // Primeira ocorrência vence. Duplicata é anomalia da fronteira, e escolher a última seria
    // arbitrário — nenhuma das duas é "mais verdadeira" que a outra.
    if (!porEixo.has(e.axis)) porEixo.set(e.axis, e);
  }
  return EIXOS_PUBLICADOS.map((axis) => ({ axis, entrada: porEixo.get(axis) ?? null }));
}

/**
 * O analytics está utilizável? — **D13**.
 *
 * *"analytics aparece com `ready|partial` mesmo com `final_result` pendente"*. A regra vive aqui,
 * numa função só, em vez de espalhada em condições pela tela: é ela que impede a superfície de
 * bloquear uma capacidade pronta porque outra ainda está acontecendo.
 *
 * **`partial` não é "resultado parcial".** Ele pertence ao componente analítico e diz que aquele
 * componente entregou parte do que mede. Não existe, no contrato, resultado final parcialmente
 * pronto: `final_result` é `pending`, `ready` ou `failed`, e mais nada.
 */
export function analyticsUtilizavel(eixos: readonly EixoLido[]): boolean {
  const a = eixos.find((e) => e.axis === "analytics")?.entrada;
  if (!a || a.axis !== "analytics") return false;
  const estado: AnalyticsAxisState = a.state;
  return estado === "ready" || estado === "partial";
}

/**
 * O `final_result` ainda está pendente?
 *
 * Serve para a superfície poder dizer as duas coisas ao mesmo tempo — "isto já dá para usar" e "o
 * resultado final ainda não existe" — sem que uma apague a outra. Não é usado para esconder nada.
 */
export function resultadoFinalPendente(eixos: readonly EixoLido[]): boolean {
  const f = eixos.find((e) => e.axis === "final_result")?.entrada;
  return f?.axis === "final_result" && f.state === "pending";
}
