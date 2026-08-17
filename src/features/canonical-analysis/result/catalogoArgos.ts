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
