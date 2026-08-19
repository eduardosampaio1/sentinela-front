// Os nomes do CATÁLOGO do ARGOS — o segundo registro de apresentação, e por que ele é segundo.
//
// ## O buraco que ele fecha
//
// `rotuloDe` na visão Diagnóstico consulta `descriptorDe`, e sem descriptor mostra o id cru. O
// cadeado é deliberado e continua valendo: indicador novo no backend não aparece com rótulo
// adivinhado.
//
// Só que `INDICATOR_DESCRIPTORS` cobre os **14** do `indicator-registry-1.0`, que é o registro de
// ECONOMIA. O ARGOS publica muito mais: o `argos-catalog-1.0` congelou **39** saídas
// quantitativas — 34 do documento de produto e 5 descobertas no contrato público —, das quais 37
// são publicáveis.
//
// Medido: **15 identificadores públicos** chegavam à tela como id cru. Entre eles `ai_health_score`
// e `behavior_score`, que são a manchete do produto inteiro. A recuperação de agosto fez o dado
// parar de cair no chão entre motor e produto; o último salto — do identificador para a palavra
// que a pessoa lê — nunca foi completado.
//
// ## Por que não entram no registro que já existe
//
// `IndicatorDescriptor` exige `sourceField`: qual campo do código analítico real sustenta o
// indicador. O catálogo do ARGOS **não publica isso** — ele publica número nominal, nome, família
// e uma nota de engenharia. Enfiar os 15 lá dentro obrigaria a inventar procedência para cada um,
// que é exatamente o que aquele campo existe para impedir.
//
// Dois registros, duas garantias, duas versões. Este aqui promete só o nome.
//
// ## Sem interseção, por construção
//
// Um id que estivesse nos dois teria dois nomes livres para divergir. O teste irmão prova que os
// conjuntos são disjuntos, e `rotuloDe` consulta o descriptor primeiro — o mais rico ganha.

// ## Por que isto devolve BOOLEANO e não a chave
//
// A primeira versão devolvia a chave pronta, e a tela fazia `t(chave)`. O gate de i18n reprovou:
// `t(variavel)` não carrega chave nenhuma no texto do programa, então nada consegue verificar se
// aquela chave existe nos dois dicionários — e uma chave ausente sai na tela como a própria
// chave, que é pior que o id cru porque parece um rótulo.
//
// Devolvendo booleano, a tela escreve o caminho literal e o gate volta a enxergar.

/**
 * Identificadores do catálogo que a UI sabe nomear, e que o registro de economia não cobre.
 *
 * ## O horizonte NÃO entra no id
 *
 * O catálogo identifica as quatro projeções como `projected_token_cost@month`, `@year` e as duas
 * irmãs de transferência — mas a nota dele é explícita: *"horizonte é DADO; o `@` só desambigua a
 * identidade no catálogo"*. O contrato público carrega `id` e `horizon` separados, justamente para
 * não obrigar o consumidor a fazer parsing de identificador para agrupar.
 *
 * Por isso são **dois** ids aqui, não quatro, e o nome não diz "/ mês": a visão já imprime o
 * horizonte ao lado. Copiar os quatro do catálogo teria criado dois rótulos que nunca casariam.
 */
export const OUTPUTS_DO_CATALOGO: readonly string[] = [
  // ── escores globais ───────────────────────────────────────────────────────
  "behavior_score",
  "ai_health_score",
  "consistency_score",
  "global_confidence",
  "cross_intent_similarity",
  "response_stability",
  "semantic_drift",
  // ── indicadores fora do registro de economia ──────────────────────────────
  "estimated_handoff_cost",
  "intents_detected_count",
  "covered_intents_count",
  "critical_alert_count",
  // ── riscos ────────────────────────────────────────────────────────────────
  "containment_risk",
  "conversion_risk",
  // ── projeções (sem o horizonte: ele é dado, e a tela o imprime ao lado) ────
  "projected_token_cost",
  "projected_handoff_cost",
];

/**
 * O id do protagonista da Visão geral — a saída número 1 do catálogo.
 *
 * Ele MORAVA no componente do herói, e o cadeado da jornada canônica o acusou: `behavior_score`
 * está na lista de "indicador analítico inventado", escrita quando o nome não existia em contrato
 * nenhum. O arquivo do catálogo é o lugar certo por dois motivos — é onde os ids publicados vivem,
 * e é o único isento daquele cadeado, com a isenção justificada e guardada contra orfandade.
 */
export const ID_DO_HEROI = "behavior_score";

const CONHECIDOS = new Set(OUTPUTS_DO_CATALOGO);

/**
 * O catálogo nomeia este output?
 *
 * `false` é resposta legítima e frequente: dimensões têm caminho próprio, `intent_id` é vocabulário
 * do cliente e não se traduz, e um output novo no backend deve continuar aparecendo como id cru
 * até alguém decidir como chamá-lo.
 */
export function nomeadoPeloCatalogo(id: string): boolean {
  return CONHECIDOS.has(id);
}

/**
 * A EXPLICAÇÃO de uma saída, ou `null` quando ela ainda não tem uma escrita.
 *
 * ## Por que um `switch` de quinze linhas, e não `t(`…${id}`)`
 *
 * A primeira versão montava a chave. O gate de i18n reprovou, e reprovou certo: ele
 * CONGELA o número de chamadas `t(variavel)` e é uma catraca **descendente** — enquanto
 * elas existirem, orfandade de tradução é indecidível, e o número só pode cair. Subir de
 * 9 para 10 é exatamente o que ela existe para impedir.
 *
 * É o mesmo caminho literal que `rotuloDoMotivo` já usa para os códigos de severidade,
 * nesta mesma frente. Verboso, e é o preço de a chave ser conferível.
 *
 * ## Sem descrição, `null` — e quem chama não desenha nada
 *
 * Metade das saídas ainda não tem texto. Um `i` que abre e não diz nada é pior que
 * nenhum: promete explicação e entrega vazio.
 *
 * O horizonte da projeção cai no id base: `projected_token_cost@month` é o mesmo output.
 */
export function explicacaoDe(t: (k: string) => string, id: string): string | null {
  switch (id.split("@")[0]) {
    case "behavior_score":
      return t("canonicalAnalysis.argos.outputDescription.behavior_score");
    case "ai_health_score":
      return t("canonicalAnalysis.argos.outputDescription.ai_health_score");
    case "consistency_score":
      return t("canonicalAnalysis.argos.outputDescription.consistency_score");
    case "global_confidence":
      return t("canonicalAnalysis.argos.outputDescription.global_confidence");
    case "cross_intent_similarity":
      return t("canonicalAnalysis.argos.outputDescription.cross_intent_similarity");
    case "response_stability":
      return t("canonicalAnalysis.argos.outputDescription.response_stability");
    case "semantic_drift":
      return t("canonicalAnalysis.argos.outputDescription.semantic_drift");
    case "estimated_handoff_cost":
      return t("canonicalAnalysis.argos.outputDescription.estimated_handoff_cost");
    case "containment_risk":
      return t("canonicalAnalysis.argos.outputDescription.containment_risk");
    case "conversion_risk":
      return t("canonicalAnalysis.argos.outputDescription.conversion_risk");
    case "intents_detected_count":
      return t("canonicalAnalysis.argos.outputDescription.intents_detected_count");
    case "covered_intents_count":
      return t("canonicalAnalysis.argos.outputDescription.covered_intents_count");
    case "critical_alert_count":
      return t("canonicalAnalysis.argos.outputDescription.critical_alert_count");
    case "projected_token_cost":
      return t("canonicalAnalysis.argos.outputDescription.projected_token_cost");
    case "projected_handoff_cost":
      return t("canonicalAnalysis.argos.outputDescription.projected_handoff_cost");
    default:
      return null;
  }
}
