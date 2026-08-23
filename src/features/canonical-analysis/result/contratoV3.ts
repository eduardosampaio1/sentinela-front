// Contrato CANÔNICO do documento ARGOS: `analysis-result-v3`.
//
// O dono é o `sentinela-result-assembler`; o Orchestrator monta, e o contrato público o declara
// pelo `result_schema_version`. Os TIPOS não são redefinidos aqui — vêm da cópia de origem em
// `@/lib/v1/contract/public-v3.types`. Redefini-los produziria a segunda cópia que sempre
// parece autoritativa para quem a encontra primeiro.
//
// ## O que o v3 é, e o que ele NÃO é
//
// É o ARGOS inteiro, e só ele: sete famílias analíticas mais recomendações, evidência, alertas,
// issues e sumário executivo. **Não** carrega projeção do Analytics — quem funde os dois é o
// `analysis-result-v2`, congelado como legado compatível.
//
// ## As duas distinções que este arquivo existe para preservar
//
// **Omitido ≠ vazio.** Campo ausente diz "esta capacidade não foi produzida neste documento";
// `[]` diz "ela existe, rodou e não achou nada". Materializar o ausente como lista vazia faz a
// tela dizer "procuramos e não há", que é uma afirmação que ninguém fez.
//
// **Ausência nunca é zero.** `not_measured` sem valor não vira `0` em lugar nenhum. Custo zero e
// custo desconhecido são a mesma pixel para quem lê, e decisões opostas para quem decide.

import type {
  AnalysisResultV3Document,
  PublicAlert,
  PublicEvidenceSummaryV3,
  PublicExecutiveSummary,
  PublicIndicatorV3,
  PublicIntent,
  PublicIssue,
  PublicMeasurement,
  PublicProjection,
  PublicRecommendation,
  PublicRisk,
  PublicScore,
} from "@/lib/v1/contract/public-v3.types";

export type {
  AnalysisResultV3Document,
  PublicAlert,
  PublicEvidenceSummaryV3,
  PublicExecutiveSummary,
  PublicIndicatorV3,
  PublicIntent,
  PublicIssue,
  PublicMeasurement,
  PublicProjection,
  PublicRecommendation,
  PublicRisk,
  PublicScore,
};

/** O discriminador contratado. É por ele que a fronteira escolhe a árvore. */
export const CANONICAL_RESULT_V3_SCHEMA = "analysis-result-v3" as const;

/** O valor que o cliente envia para PEDIR o v3.
 *
 * O Orchestrator aceita três grafias (`3`, `v3`, `analysis-result-v3`); o manifesto público as
 * declara. Aqui escolhemos UMA e a usamos sempre: três grafias no cliente dariam três formas de
 * a mesma requisição aparecer no log, e a divergência só apareceria quando alguém comparasse.
 */
export const PEDIDO_DE_V3 = "3" as const;

/** As onze famílias do documento, na ordem em que o contrato as declara.
 *
 * Ordem é do CONTRATO, não da tela: a View pode agrupar e priorizar, mas a lista canônica de
 * "o que pode existir" mora aqui, e é ela que o gate de cobertura confere.
 */
export const FAMILIAS_ARGOS = [
  "scores",
  "dimensions",
  "indicators",
  "intents",
  "risks",
  "projections",
  "recommendations",
  "evidence",
  "alerts",
  "issues",
  "executive_summary",
] as const;

export type FamiliaArgos = (typeof FAMILIAS_ARGOS)[number];

/** As quatro dimensões de saúde do ARGOS. Fechada — não existe quinta.
 *
 * **Não confundir com as dimensões do Analytics**, que são outro conceito, de outro motor, com
 * outra fonte. O nome coincide; o significado não.
 */
export const DIMENSOES_DE_SAUDE = ["semantic", "behavioral", "structural", "economic"] as const;

export type MotivoDeRecusaV3 = "missing_schema" | "unknown_schema" | "malformed_document";

export type ValidacaoV3 =
  | { status: "ok"; documento: AnalysisResultV3Document }
  | { status: "recusado"; reason: MotivoDeRecusaV3 };

/**
 * Fronteira do documento v3 — o único lugar que abre o `result: unknown` do transporte.
 *
 * Valida a ESPINHA (o que a View não sabe renderizar sem): identidade, versões de procedência,
 * `summary` e `partiality`. As famílias são todas opcionais por contrato, e exigi-las aqui
 * transformaria "esta análise não produziu risco" em documento malformado.
 */
export function validarResultadoV3(
  schemaVersion: unknown,
  documento: unknown,
): ValidacaoV3 {
  if (typeof schemaVersion !== "string" || schemaVersion.trim() === "") {
    return { status: "recusado", reason: "missing_schema" };
  }
  if (schemaVersion !== CANONICAL_RESULT_V3_SCHEMA) {
    return { status: "recusado", reason: "unknown_schema" };
  }
  if (documento === null || typeof documento !== "object" || Array.isArray(documento)) {
    return { status: "recusado", reason: "malformed_document" };
  }

  const d = documento as Record<string, unknown>;
  const textoObrigatorio = [
    "analysis_id",
    "indicator_registry_version",
    "measurement_contract_version",
    "argos_catalog_version",
  ];
  for (const campo of textoObrigatorio) {
    if (typeof d[campo] !== "string" || (d[campo] as string).trim() === "") {
      return { status: "recusado", reason: "malformed_document" };
    }
  }
  for (const campo of ["summary", "partiality", "method"]) {
    const v = d[campo];
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return { status: "recusado", reason: "malformed_document" };
    }
  }

  // `summary.record_count` é o DENOMINADOR, e ele não pode faltar.
  //
  // O contrato o declara obrigatório (`PublicSummary.record_count: number`), e até aqui a
  // checagem só exigia que `summary` fosse um objeto. Um documento sem o campo passava, e a tela
  // escrevia **"medido sobre NaN conversas"** — encontrado ao pôr a tela no ar, não em teste.
  //
  // `NaN` é pior que zero, e zero já é o que esta casa proíbe: ele não é número, não é ausência
  // declarada, e o leitor não tem como saber se o problema é o dado ou a tela. Recusar o
  // documento na fronteira dá a resposta certa — *"o que voltou está sem as informações de que
  // esta visão precisa"* —, que é verdade, em vez de uma medição com cara de defeito.
  const resumo = d.summary as Record<string, unknown>;
  if (typeof resumo.record_count !== "number" || !Number.isFinite(resumo.record_count)) {
    return { status: "recusado", reason: "malformed_document" };
  }

  // Cada família, quando PRESENTE, precisa ter a forma que a View espera. `null` e ausente
  // continuam legítimos e distintos de `[]` — a checagem aceita os três e recusa só o que não
  // é nenhum dos três (um objeto onde deveria haver lista, por exemplo).
  for (const familia of FAMILIAS_ARGOS) {
    if (familia === "executive_summary") continue;
    const v = d[familia];
    if (v === undefined || v === null) continue;
    if (!Array.isArray(v)) return { status: "recusado", reason: "malformed_document" };
  }

  return { status: "ok", documento: documento as AnalysisResultV3Document };
}

/**
 * Uma família foi PRODUZIDA neste documento?
 *
 * `undefined`/`null` → não. `[]` → sim, e produziu zero itens. A distinção existe porque as duas
 * telas são diferentes: uma diz "o ARGOS não avalia risco nesta análise", a outra diz "avaliou e
 * não encontrou risco nenhum". Colapsá-las é a falha que não parece falha.
 */
export function familiaFoiProduzida(
  documento: AnalysisResultV3Document,
  familia: FamiliaArgos,
): boolean {
  const valor = (documento as unknown as Record<string, unknown>)[familia];
  return valor !== undefined && valor !== null;
}

/** A medição tem valor apresentável? Estado manda; valor nunca é inferido do estado. */
export function medicaoTemValor(m: Pick<PublicMeasurement, "value">): boolean {
  return m.value !== undefined && m.value !== null;
}
