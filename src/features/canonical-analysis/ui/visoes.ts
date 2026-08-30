// As visões que uma Analysis oferece. **Dado**, não componente.
//
// Mora fora do shell por duas razões, e a segunda importa mais que a primeira:
//
//   1. Fast refresh só funciona quando um arquivo exporta apenas componentes.
//   2. A lista é o CONTRATO INTERNO entre o shell e o router: um item aqui sem rota registrada
//      manda a pessoa ao 404, e uma rota sem item aqui é uma visão inalcançável. Num arquivo
//      só, essa correspondência fica visível — e há gate provando que ela vale.

/** Uma visão alcançável a partir do shell da Analysis. */
export type CaminhoDaVisao = "argos" | "analytics" | "review";

export interface VisaoDaAnalise {
  /** Sufixo da subrota (`argos`, `analytics`) — e também a identidade do rótulo em i18n. */
  readonly caminho: CaminhoDaVisao;
}

/** As visões que EXISTEM. A ordem é a da leitura: a inteligência antes da exploração. */
export const VISOES_DA_ANALISE: readonly VisaoDaAnalise[] = [
  { caminho: "argos" },
  { caminho: "analytics" },
  { caminho: "review" },
];
