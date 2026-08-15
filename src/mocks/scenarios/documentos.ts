// Os DOCUMENTOS das duas visões — o v3 do ARGOS e o snapshot do Analytics.
//
// Eles moram aqui, e não no `catalogo.ts`, porque passaram a ter dois consumidores: o catálogo
// (comparação v3, `analytics-partial`, `analytics-withheld`, `privacy-omission`) e o módulo da
// M45.4. Deixá-los no catálogo obrigaria `two-view.ts` a importar VALOR de quem já o importa de
// volta — um ciclo real, não o `import type` inócuo que `assinaturas.ts` faz.
//
// A separação também diz o que estas duas rotas são: `/result` e `/analytics` são documentos
// DISTINTOS, de motores distintos. Um helper único que servisse as duas convidaria um scenario a
// montar as duas de uma vez, e uma tela que lê o documento errado passaria despercebida.

import { http, HttpResponse } from "msw";
import V3_MASSA from "@/test/fixtures/canonical-result/v3-comparacao.json";

const json = (b: unknown, s = 200) => HttpResponse.json(b as Record<string, unknown>, { status: s });

/**
 * Os documentos v3 da comparação — produzidos pelo caminho real, não escritos aqui.
 *
 * JSON, e não módulo TS, porque a massa é SAÍDA de produtor: transcrevê-la para código convidaria
 * a "ajustar um número" numa revisão, e o número deixaria de ser o que o motor produziu.
 */
export const V3_COMPARACAO = V3_MASSA as {
  A: Record<string, unknown>;
  B: Record<string, unknown>;
  B_QUEBRA: Record<string, unknown>;
};

/**
 * O envelope PÚBLICO do resultado. Só os campos que `public-v1.json` declara — o artefato do
 * orchestrator traz mais (versão do assembler, do engine, fingerprint), e servi-los aqui faria o
 * scenario ensinar a tela a ler o que a fronteira pública não entrega.
 */
export function envelopeV3(analysisId: string, documento: Record<string, unknown>) {
  return {
    analysis_id: analysisId,
    result_schema_version: "analysis-result-v3",
    indicator_registry_version: String(documento.indicator_registry_version),
    result: documento,
  };
}

/** O snapshot do Analytics. Rota própria, motor próprio — nunca servida junto com `/result`. */
export const analytics = (base: string, corpo: Record<string, unknown>) =>
  http.get(`${base}/v1/analyses/:id/analytics`, () => json({ analysis_id: "an-abc", ...corpo }));
