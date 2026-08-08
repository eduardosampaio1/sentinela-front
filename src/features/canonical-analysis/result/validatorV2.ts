// Validador da fronteira do documento INTEGRADO (`analysis-result-v2`).
//
// Mesma disciplina do v1: o discriminador é o campo CONTRATADO do envelope público, o documento é
// inspecionado campo a campo, e `unsupported` nunca vira renderização adivinhada.
//
// O que este arquivo acrescenta ao v1 são as recusas que só existem quando há dois insumos:
//
//   analytics ausente               o bloco é OBRIGATÓRIO — sem ele o documento não é v2
//   status fora do vocabulário      três estados, e não "o que vier"
//   ready/partial sem conteúdo      publicar "há resultado analítico" sobre nada
//   withheld com conteúdo           se há algo a liberar, o desfecho não era withheld
//   conteúdo ilegível               "não soube ler" não pode virar "não veio"
//   denominador contraditório       o documento discorda de si mesmo (ver abaixo)
//
// ## A contradição do denominador
//
// `analytics.record_count` é EXTRAÍDO do snapshot pelo backend (`analytics_client`: o cliente lê
// `snapshot["record_count"]`). Os dois são, por construção, o mesmo número — então divergirem
// significa que algo entre a extração e a tela mudou um dos lados.
//
// Não há como escolher: os dois afirmam o denominador de tudo que está no bloco, e mostrar
// qualquer um deles seria apostar. A recusa é o único desfecho que não publica um número
// possivelmente errado com a mesma cara de um certo.

import type { CanonicalResultV2 } from "./canonicalSchemaV2";
import { CANONICAL_RESULT_V2_SCHEMA, COMPONENT_STATUSES } from "./canonicalSchemaV2";
import type { ComponentStatus } from "./canonicalSchemaV2";
import { lerSnapshot, type SnapshotAnalitico } from "./analyticsProjection";
import {
  ehObjeto,
  lerDimensao,
  lerEvidencia,
  lerIndicador,
  lerParcialidade,
  lerRecomendacao,
  lista,
  numeroOuNulo,
  textoOuNulo,
} from "./leitores";

/**
 * Os desfechos. As razões do v1 são reusadas para as mesmas situações, e as novas nomeiam
 * exatamente o que quebrou — um balde único faria a tela dizer "documento inválido" quando o
 * problema é conhecido e específico.
 */
/**
 * O bloco analítico já resolvido, em união DISCRIMINADA.
 *
 * `withheld` não tem snapshot e `ready`/`partial` sempre têm — e isso é garantido pelo TIPO, não
 * por um `if` no consumidor. Um `snapshot: SnapshotAnalitico | null` obrigaria cada chamador a
 * tratar um `null` que nunca acontece em `ready`, e o tratamento inventado para o caso impossível
 * seria um fallback silencioso: um documento contraditório apareceria na tela como retido, que é
 * uma afirmação de privacidade que ninguém fez.
 */
export type BlocoAnaliticoLido =
  | { status: "withheld" }
  | { status: "ready" | "partial"; snapshot: SnapshotAnalitico };

export type ValidationOutcomeV2 =
  | { status: "supported"; value: CanonicalResultV2; analytics: BlocoAnaliticoLido }
  | {
      status: "unsupported";
      reason:
        | "missing_schema"
        | "unknown_schema"
        | "schema_mismatch"
        | "malformed"
        | "analytics_missing"
        | "analytics_status_unknown"
        | "analytics_content_incoherent"
        | "analytics_content_unreadable"
        | "analytics_record_count_conflict";
    };

type Recusa = Extract<ValidationOutcomeV2, { status: "unsupported" }>;

function recusar(reason: Recusa["reason"]): Recusa {
  return { status: "unsupported", reason };
}

/**
 * O bloco analítico validado: os campos do envelope, mais o conteúdo já resolvido.
 *
 * O desfecho mora em `status` (herdado de `BlocoAnaliticoLido`) e **não** existe um
 * `component_status` ao lado dele: dois campos com o mesmo significado são duas verdades
 * esperando para divergir, e a que estivesse errada decidiria a tela.
 */
type BlocoLido = {
  projection_digest: string;
  snapshot_contract_version: string;
  record_count: number | null;
  data: Record<string, unknown> | null;
} & BlocoAnaliticoLido;

function lerBlocoAnalitico(bruto: unknown): BlocoLido | Recusa {
  if (!ehObjeto(bruto)) return recusar("analytics_missing");

  const status = bruto.component_status;
  if (
    typeof status !== "string" ||
    !COMPONENT_STATUSES.includes(status as ComponentStatus) // vocabulário fechado
  ) {
    return recusar("analytics_status_unknown");
  }
  const estado = status as ComponentStatus;

  // Identidade e versão são obrigatórias nos TRÊS estados — inclusive em `withheld`, onde o
  // digest cobre o envelope da própria retenção. Um bloco sem elas não é auditável.
  const digest = textoOuNulo(bruto.projection_digest);
  const versao = textoOuNulo(bruto.snapshot_contract_version);
  if (!digest || !versao) return recusar("malformed");

  const denominador = bruto.record_count === undefined ? null : numeroOuNulo(bruto.record_count);

  if (estado === "withheld") {
    // A recusa aqui é do conteúdo, não da forma: `withheld` com `data` é uma contradição do
    // documento consigo mesmo, e não um campo malformado.
    if (bruto.data !== undefined && bruto.data !== null) {
      return recusar("analytics_content_incoherent");
    }
    return {
      projection_digest: digest,
      snapshot_contract_version: versao,
      // `withheld` não traz denominador: não há projeção sobre a qual contar. Se vier um, ele
      // é ignorado em vez de exibido — mostrar uma contagem do que se decidiu não liberar
      // devolveria pela metadata o que o payload protegeu.
      record_count: null,
      data: null,
      status: "withheld",
    };
  }

  if (bruto.data === undefined || bruto.data === null) {
    return recusar("analytics_content_incoherent");
  }
  const snapshot = lerSnapshot(bruto.data);
  if (snapshot === null) return recusar("analytics_content_unreadable");

  if (denominador !== null && denominador !== snapshot.record_count) {
    return recusar("analytics_record_count_conflict");
  }

  return {
    projection_digest: digest,
    snapshot_contract_version: versao,
    // O denominador declarado, ou o do snapshot quando o envelope não o trouxe. Não é
    // fabricação: os dois são o mesmo número por construção, e o teste acima já provou que
    // eles não divergem.
    record_count: denominador ?? snapshot.record_count,
    data: bruto.data as Record<string, unknown>,
    status: estado,
    snapshot,
  };
}

/**
 * Inspeciona o `result` do contrato público sob o contrato INTEGRADO.
 *
 * `snapshot` sai junto do desfecho `supported` porque lê-lo é caro e fazê-lo de novo no adapter
 * abriria a porta para as duas leituras divergirem — o mesmo motivo pelo qual a validação e a
 * adaptação nunca compartilharam o payload bruto no v1.
 */
export function validateCanonicalResultV2(
  versaoDeclarada: unknown,
  bruto: unknown,
): ValidationOutcomeV2 {
  if (typeof versaoDeclarada !== "string" || versaoDeclarada.trim() === "") {
    return recusar("missing_schema");
  }
  if (versaoDeclarada !== CANONICAL_RESULT_V2_SCHEMA) return recusar("unknown_schema");
  if (!ehObjeto(bruto)) return recusar("malformed");

  const interna = bruto.result_schema_version;
  if (interna !== undefined && interna !== null && interna !== CANONICAL_RESULT_V2_SCHEMA) {
    return recusar("schema_mismatch");
  }

  // O cabeçalho do v2 NÃO tem `record_count` — tem `engine_window_record_count`. Aceitar o nome
  // antigo aqui faria a contagem da Engine e o denominador analítico voltarem a ser lidos um
  // pelo outro, que é exatamente o que a MF6.3 separou.
  const summaryBruto = bruto.summary;
  if (!ehObjeto(summaryBruto)) return recusar("malformed");
  const janelaDaEngine = numeroOuNulo(summaryBruto.engine_window_record_count);
  const analyzedAt = textoOuNulo(summaryBruto.analyzed_at);
  if (janelaDaEngine === null || analyzedAt === null) return recusar("malformed");

  const parcialidade = lerParcialidade(bruto.partiality);
  if (parcialidade === null) return recusar("malformed");

  const bloco = lerBlocoAnalitico(bruto.analytics);
  // `status` discrimina os dois: a recusa é `"unsupported"`, e os três desfechos do bloco são o
  // vocabulário do Analytics. Testar a PRESENÇA do campo não separaria mais nada — os dois o têm.
  if (bloco.status === "unsupported") return bloco;

  return {
    status: "supported",
    value: {
      analysis_id: textoOuNulo(bruto.analysis_id) ?? "",
      result_schema_version: CANONICAL_RESULT_V2_SCHEMA,
      measurement_contract_version: textoOuNulo(bruto.measurement_contract_version) ?? "",
      summary: { engine_window_record_count: janelaDaEngine, analyzed_at: analyzedAt },
      partiality: parcialidade,
      indicators: lista(bruto.indicators, lerIndicador),
      dimensions: lista(bruto.dimensions, lerDimensao),
      recommendations: lista(bruto.recommendations, lerRecomendacao),
      evidence: lista(bruto.evidence, lerEvidencia),
      analytics: {
        component_status: bloco.status,
        projection_digest: bloco.projection_digest,
        snapshot_contract_version: bloco.snapshot_contract_version,
        record_count: bloco.record_count,
        data: bloco.data,
      },
    },
    analytics:
      bloco.status === "withheld"
        ? { status: "withheld" }
        : { status: bloco.status, snapshot: bloco.snapshot },
  };
}
