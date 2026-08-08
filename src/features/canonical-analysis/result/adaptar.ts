// A FRONTEIRA ÚNICA entre contratos. **O único lugar do frontend que decide versão.**
//
// Tudo abaixo daqui — view models, áreas, página — recebe algo já resolvido e não sabe qual
// contrato o produziu. Espalhar `if (version === …)` pela árvore de componentes é como um
// contrato novo vira dezenas de ramos, cada um decidindo por conta própria o que fazer com o que
// não conhece.
//
// ## Sem fallback silencioso, nos dois sentidos
//
// A escolha é pelo DISCRIMINADOR, e é definitiva: um documento que se declara v2 e não passa na
// validação do v2 é recusado com a razão do v2. Ele **não** é oferecido ao adapter v1 "para ver
// se aproveita algo" — o v1 aceitaria a espinha comum (indicadores, recomendações) e descartaria
// o bloco analítico inteiro, e a tela mostraria um resultado que parece completo, sem nada
// dizendo que a parte analítica sumiu. Essa é a falha mais cara possível aqui: ela não parece uma
// falha.

import type { AnalysisResultView } from "@/lib/v1";
import { CANONICAL_RESULT_SCHEMA } from "./canonicalSchema";
import { CANONICAL_RESULT_V2_SCHEMA } from "./canonicalSchemaV2";
import { adaptAnalysisResult, type ResultViewModel } from "./adapter";
import { adaptAnalysisResultV2, type ResultV2Adaptation, type ResultV2ViewModel } from "./adapterV2";

/**
 * O resultado resolvido, ou a recusa.
 *
 * `contrato` é o discriminador da união — a página escolhe a árvore por ele, e o TypeScript
 * garante que nenhuma das duas leia campo da outra.
 */
export type ResultadoResolvido =
  | { contrato: "v1"; view: ResultViewModel }
  | { contrato: "v2"; view: ResultV2ViewModel }
  | {
      contrato: "nenhum";
      schemaVersion: string;
      reason: Extract<ResultV2Adaptation, { status: "unsupported" }>["reason"];
    };

export function resolverResultado(
  publico: AnalysisResultView,
  locale = "en",
): ResultadoResolvido {
  const versao = publico.result_schema_version;

  if (versao === CANONICAL_RESULT_V2_SCHEMA) {
    const r = adaptAnalysisResultV2(publico, locale);
    return r.status === "supported"
      ? { contrato: "v2", view: r.view }
      : { contrato: "nenhum", schemaVersion: versao, reason: r.reason };
  }

  if (versao === CANONICAL_RESULT_SCHEMA) {
    const r = adaptAnalysisResult(publico, locale);
    return r.status === "supported"
      ? { contrato: "v1", view: r.view }
      : { contrato: "nenhum", schemaVersion: versao, reason: r.reason };
  }

  // Versão que este frontend não conhece. A distinção entre "não veio" e "veio outra" fica de
  // pé porque as duas mandam a mesma pessoa procurar coisas diferentes.
  return {
    contrato: "nenhum",
    schemaVersion: typeof versao === "string" ? versao : "",
    reason:
      typeof versao !== "string" || versao.trim() === "" ? "missing_schema" : "unknown_schema",
  };
}
