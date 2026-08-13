// M40 — massa da Baseline Reference, derivada do produtor REAL congelado pela BD10.
//
// ## O que estas fixtures representam, e o que elas se recusam a representar
//
// A razão original do bloqueio do `no-baseline` dizia: *"Baseline NÃO existe no contrato público.
// Nenhuma operação a cria, lê ou compara."* As duas primeiras ausências acabaram — `GET`, `POST` e
// `DELETE` de `/v1/instances/{id}/baseline` estão publicados, e os candidatos saem de
// `GET /v1/analyses?instance_id=&baseline_eligible=true`. **A terceira continua verdadeira**, e é
// por isso que nada aqui compara nada.
//
// ## O ponteiro é IDENTIDADE
//
// `baseline_analysis_id` é a única forma de dizer qual é a régua. Nenhuma fixture pareia por
// título, data, posição, nome ou rótulo — e nenhuma expressa "a mais recente". D25: *"Não é a
// primeira execução automaticamente, nem janela móvel… Substituir é ação explícita."*
//
// Os `created_at` dos candidatos são deliberadamente **fora de ordem** em relação aos ids: se
// alguma tela vier a escolher "a última", ela escolherá o candidato errado e o gate vai vê-lo.
//
// ## Por que não existe `serves_argos`, `v3_available` nem `comparable`
//
// Porque o contrato não os publica, e a BD10 decidiu por escrito que **v3 não é requisito da
// referência**: uma Analysis v1/v2-only é referência legítima. O item da listagem sequer carrega
// versão de documento — e essa ausência É a prova. Acrescentar o campo aqui ensinaria a tela a ler
// algo que a fronteira pública não entrega, e a filtrar por um critério que o backend rejeitou.
//
// ## O `set_at` é do ATO
//
// Ele existe porque *desde quando esta é a régua* muda como um leitor interpreta a configuração.
// O banco recusa a metade do par (`CHECK orchestrator_instances_baseline_par`): ou os dois campos
// têm valor, ou nenhum tem. As fixtures respeitam isso — não porque o Front precise, mas porque
// uma massa que viole o invariante do produtor ensina a tela a tratar um estado impossível.

import type { AnalysisListPage } from "@/lib/v1";
import { INSTANCIA } from "@/test/fixtures/public-v1/instances";

/** A resposta do sub-recurso de baseline. Shape do `BaselineView` publicado, e nada além. */
export interface BaselineView {
  instance_id: string;
  /** `null` = `NO_BASELINE` — estado LEGÍTIMO e inicial, nunca erro. */
  baseline_analysis_id: string | null;
  /** Sempre `null` junto com o ponteiro, e sempre preenchido junto com ele. */
  baseline_set_at: string | null;
}

/**
 * Candidato elegível.
 *
 * O shape é o do item da listagem pública — o MESMO de `analiseDaInstancia`, porque candidato **é**
 * uma Analysis e a listagem é onde as Analysis moram. O que muda não é o formato: é quem filtrou.
 *
 * Todos são `completed` e desta Instance porque **foi o backend que os selecionou**. O Front não
 * recorta `status === "completed"` para montar o seletor — a regra de elegibilidade tem um dono, e
 * não é ele.
 */
function candidato(
  analysis_id: string,
  over: Partial<AnalysisListPage["items"][number]> = {},
): AnalysisListPage["items"][number] {
  return {
    analysis_id,
    status: "completed",
    record_count: 980,
    result_available: true,
    created_at: "2026-08-01T11:00:00Z",
    instance_id: INSTANCIA.instance_id,
    ...over,
  };
}

/**
 * Os TRÊS candidatos elegíveis. A contagem é congelada nos gates — `length > 0` passaria numa
 * massa que perdesse dois deles.
 *
 * Três, e não dois, porque a prova de troca precisa de uma régua, uma alternativa **e** um terceiro
 * que não participa: com só dois, "trocou para a outra" é indistinguível de "alternou".
 *
 * `created_at` fora de ordem em relação aos ids: `an-cand-0002` é o mais RECENTE, e ele nunca é a
 * régua de nenhum scenario. Uma tela que escolhesse "a última concluída" — o que D25 proíbe e o que
 * `SENTINELA_AUTO_BASELINE` faz no caminho legado — apontaria para ele, e o gate veria.
 */
export const CANDIDATOS: AnalysisListPage["items"] = [
  candidato("an-cand-0001", { created_at: "2026-07-31T09:15:00Z", record_count: 1240 }),
  candidato("an-cand-0002", { created_at: "2026-08-05T18:40:00Z", record_count: 640 }),
  candidato("an-cand-0003", { created_at: "2026-08-02T07:05:00Z", record_count: 2310 }),
];

/** Congelada aqui e conferida nos gates — a massa declara a própria cardinalidade. */
export const TOTAL_DE_CANDIDATOS = 3;

/** A página de candidatos. `next_cursor: null`: três cabem numa página, e inventar cursor seria
 * ensinar a tela a paginar uma travessia que esta massa não faz. */
export const CANDIDATOS_PAGINA: AnalysisListPage = {
  items: CANDIDATOS,
  next_cursor: null,
};

/** A régua do scenario `baseline-set`. É o candidato MAIS ANTIGO, e nunca o mais recente. */
export const BASELINE_ESCOLHIDO = "an-cand-0001";

/** A alternativa que prova a troca. Distinta da régua, e presente entre os elegíveis. */
export const BASELINE_ALTERNATIVO = "an-cand-0003";

export const SEM_BASELINE: BaselineView = {
  instance_id: INSTANCIA.instance_id,
  baseline_analysis_id: null,
  baseline_set_at: null,
};

export const COM_BASELINE: BaselineView = {
  instance_id: INSTANCIA.instance_id,
  baseline_analysis_id: BASELINE_ESCOLHIDO,
  baseline_set_at: "2026-08-06T13:22:00Z",
};

/** O carimbo que uma eleição feita DENTRO do scenario produz.
 *
 * Determinístico de propósito: prova que muda de resultado entre execuções não é prova. O produtor
 * real usa `now()` da transação; o que a massa representa é a ESTRUTURA — o par nunca vem pela
 * metade.
 */
export const SET_AT_DA_TROCA = "2026-08-06T13:45:00Z";

/** Constrói a resposta de uma eleição. Usado pelos handlers com estado. */
export const baselineEm = (analysisId: string, setAt = SET_AT_DA_TROCA): BaselineView => ({
  instance_id: INSTANCIA.instance_id,
  baseline_analysis_id: analysisId,
  baseline_set_at: setAt,
});
