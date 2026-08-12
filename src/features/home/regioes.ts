// M32 — a classificação das análises nas regiões operacionais de HOME-01.
//
// Módulo PURO. Recebe os itens de `GET /v1/analyses` como o contrato os publica e devolve quem
// mora em cada região. Não busca, não recalcula, não ordena, não traduz e não decide permissão.
//
// ## A pergunta que a Home responde
//
// D9: *"A Home do Workspace tem quatro regiões… **Não é dashboard de KPIs**"*. O DoD da M32 diz o
// resto: a Home responde *"o que precisa de mim"*, não *"quantos temos"*. Por isso aqui não existe
// contagem agregada, score, saúde, percentual nem ranking — nada que exista só para ocupar espaço.
//
// ## A ordem é a da origem
//
// Nenhuma região reordena. `GET /v1/analyses` entrega por cursor determinístico, e inventar
// prioridade aqui — "mais grave primeiro", "mais antigo primeiro" — seria a UI decidindo urgência
// que ninguém mediu. A ordem que chega é a ordem que se lê.
//
// ## A contradição que este módulo teve de resolver
//
// O Blueprint §4.3 define a região *Ações necessárias* como *"análises em `needs_mapping` e
// `failed` **com `retry_allowed`**"*, e no mesmo quadro fixa a fonte de verdade: *"`GET
// /v1/analyses` (filtro no view model, sem recálculo)"*.
//
// **Os dois não podem ser verdade ao mesmo tempo.** `retry_allowed` aparece UMA vez no contrato
// público inteiro, em `AnalysisStatusView` — a projeção de `GET /v1/analyses/{id}`. O item de
// listagem não o publica. Filtrar a lista por ele exigiria uma chamada por análise falha, que é o
// N+1 que a própria linha proíbe.
//
// Resolução, pela autoridade mais forte (o contrato publicado manda sobre a prosa do Blueprint):
// **toda `failed` entra na região**, e a Home **não oferece "Tentar novamente"**. Isso não perde
// nada: o mesmo Blueprint, no quadro de estados, condiciona o CTA — *"Tentar novamente **se**
// `retry_allowed`"* —, e quem sabe o valor é AN-04, que carrega o status individual. Uma Home que
// oferecesse o botão sem saber se a operação existe seria CTA sem owner (Regra de Ouro #37); uma
// Home que escondesse a falha por não saber se é recuperável esconderia justamente o que precisa
// de alguém.
//
// ## Ninguém some
//
// `completed` com `result_available: false` não pertence a nenhuma das três regiões do §4.3 — a
// linha é literal: *"`completed` **com** `result_available`"*. Some da Home? Não: sumir faria
// "a análise não produziu resultado" e "esta tela não sabe onde pôr isto" parecerem a mesma coisa.
// Ela sai num balde próprio, declarado, para quem compõe a tela decidir com autoridade.
//
// O mesmo vale para um `status` que não esteja no vocabulário público: a fronteira deveria tê-lo
// recusado antes, e se chegou aqui é incidente — visível, nunca engolido pelo `default`.

import { PUBLIC_STATES, type AnalysisListItem, type AnalysisStatus } from "@/lib/v1";

/** As três regiões que têm conteúdo canônico. Instâncias não está aqui — ver `INSTANCIAS`. */
export type RegiaoDaHome = "acoes_necessarias" | "em_andamento" | "resultados_recentes";

/**
 * A região de Instâncias de D9 é **inalcançável** até BD02.
 *
 * BD02 não foi executada — o PLAN a agenda para a Fase 9 com blocker B3 — e o Blueprint §4.4 é
 * literal: *"o delta continua não autorizado, e o Gateway hoje executa `del project_id,
 * environment_id`"*. Não existe agrupamento por Instância a fazer, porque não existe Instância.
 *
 * Nada de placeholder funcional, Instance falsa, CTA local nem estado meio-construído: um mock
 * que devolvesse uma Instância plausível faria a tela montar e o delta de backend parecer feito.
 */
export const INSTANCIAS_INALCANCAVEL = true as const;

export interface RegioesDaHome {
  /** `needs_mapping` e `failed` — parada que espera uma pessoa. */
  acoesNecessarias: readonly AnalysisListItem[];
  /** `preparing`, `receiving`, `queued`, `running`, `recovering` — o sistema está trabalhando. */
  emAndamento: readonly AnalysisListItem[];
  /** `completed` **com** `result_available`. */
  resultadosRecentes: readonly AnalysisListItem[];
  /** `completed` **sem** `result_available`: nenhuma região do §4.3 a comporta, e ela não some. */
  concluidasSemResultado: readonly AnalysisListItem[];
  /** `status` fora de `PUBLIC_STATES`. Incidente de fronteira, nunca silêncio. */
  estadoNaoReconhecido: readonly AnalysisListItem[];
}

/** Os estados de cada região, declarados — e não espalhados por `if` pela tela afora. */
const ACAO: readonly AnalysisStatus[] = ["needs_mapping", "failed"];
const ANDAMENTO: readonly AnalysisStatus[] = [
  "preparing",
  "receiving",
  "queued",
  "running",
  "recovering",
];

export function classificarRegioes(itens: readonly AnalysisListItem[]): RegioesDaHome {
  const acoesNecessarias: AnalysisListItem[] = [];
  const emAndamento: AnalysisListItem[] = [];
  const resultadosRecentes: AnalysisListItem[] = [];
  const concluidasSemResultado: AnalysisListItem[] = [];
  const estadoNaoReconhecido: AnalysisListItem[] = [];

  for (const item of itens) {
    // Um item cai em EXATAMENTE um balde. A cadeia é excludente por construção, e o teste prova
    // que nenhuma análise aparece em duas regiões ao mesmo tempo.
    if (!PUBLIC_STATES.includes(item.status)) {
      estadoNaoReconhecido.push(item);
    } else if (ACAO.includes(item.status)) {
      acoesNecessarias.push(item);
    } else if (ANDAMENTO.includes(item.status)) {
      emAndamento.push(item);
    } else if (item.result_available) {
      // Sobrou `completed`, e só ele: a lista de estados públicos tem oito, e sete já saíram.
      resultadosRecentes.push(item);
    } else {
      concluidasSemResultado.push(item);
    }
  }

  return {
    acoesNecessarias,
    emAndamento,
    resultadosRecentes,
    concluidasSemResultado,
    estadoNaoReconhecido,
  };
}

/**
 * A Home tem o que mostrar?
 *
 * Vazio é **nenhuma análise no workspace**, não "nenhuma que eu saiba classificar". Por isso a
 * pergunta é feita sobre a lista recebida, e não sobre a soma das regiões — se um dia um estado
 * novo caísse em `estadoNaoReconhecido`, a Home mostraria o estado vazio enquanto houvesse
 * análises, que é a mentira mais fácil de cometer aqui.
 *
 * **A BD02 acrescentou uma SEGUNDA fonte.** Enquanto a região 3 era inalcançável, medir só as
 * análises era medir tudo o que a Home tinha. Com Instâncias vivas, um workspace com Instância e
 * sem análise nenhuma cairia no estado vazio e ESCONDERIA a região — a tela diria "não há nada"
 * tendo o que mostrar. Vazio passa a ser a ausência das duas coisas.
 *
 * O parâmetro é opcional de propósito: quem ainda chama com uma lista só recebe o comportamento
 * anterior, e nenhum chamador antigo muda de significado sem passar por aqui.
 */
export function homeVazia(
  itens: readonly AnalysisListItem[],
  instancias: readonly unknown[] = [],
): boolean {
  return itens.length === 0 && instancias.length === 0;
}
