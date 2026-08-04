// Quarentena de baseline da Onda 6 E1 — fonte ÚNICA (consumida por vitest.config e pelo gate).
//
// Estas 4 suítes JÁ falhavam no baseline 4255932, ANTES da camada canônica /v1. NENHUMA delas
// exercita código da E1 — todas apontam para telas/indicadores LEGADOS que não existem mais ou
// para o cliente legado `lib/api` (que a E1 é proibida de tocar e substitui pela camada
// problem+json). Ficam EXCLUÍDAS da suíte para dar um baseline verde que proteja o novo código,
// SEM inventar fórmula nem esconder regressão da E1. O gate `test/v1/quarantine-gate.test.ts`
// congela esta lista em exatamente 4 e mantém cada motivo verdadeiro pela `ancora`.
//
// Dívida: docs/onda6/E1-baseline-quarantine.md. Sair da quarentena = remover a entrada aqui
// (a âncora deixa de existir quando o arquivo é consertado, e o gate exige a remoção).

export type QuarantineCategory = "dead-stack" | "legacy-contract";

export interface QuarantineEntry {
  /** Caminho relativo à raiz do repo (mesma forma usada em `test.exclude`). */
  readonly file: string;
  readonly category: QuarantineCategory;
  /** Motivo curto e verificável. */
  readonly reason: string;
  /** Ticket de dívida (rastreável no vault). */
  readonly debtId: string;
  /** Trecho que DEVE seguir presente no arquivo — prova de que o motivo continua verdadeiro. */
  readonly ancora: string;
}

export const QUARANTINE: readonly QuarantineEntry[] = [
  // TRÊS dívidas quitadas por REMOÇÃO na Onda 8 — não por conserto. A quarentena só encolhe.
  //
  //   Q2 `homePageFlow.test.tsx`      — saiu com a `HomeWelcomePage`, provada morta.
  //   Q1 `authFlows.test.tsx`         — saiu com `pages/Login` e `pages/VerifyEmailPage`.
  //   Q3 `economicsRendering.test.tsx` — saiu com `CoreMetricsRow`, `decisionLayerModel` e
  //                                      `economicsModel`, todos fora do bundle.
  //
  // Os três já não coletavam: importavam módulos que deixaram de existir. Mantê-los na lista
  // seria declarar dívida sobre código que não existe — a quarentena viraria arquivo morto
  // com nome de dívida.
  // SENT-FE-E1-Q4 (`src/test/apiErrorFormatting.test.ts`) SAIU da quarentena porque o
  // subject sumiu: `lib/api.ts` foi removido com a aposentadoria do dashboard legado.
  //
  // O gate desta lista pegou isso sozinho — ele exige que cada arquivo em quarentena EXISTA e
  // AINDA contenha a âncora, justamente para a lista não virar arquivo morto com nome de
  // dívida. Foi ele quem cobrou a remoção.
  //
  // O invariante que aquele teste guardava ("erro de auth do backend vira mensagem legível")
  // vive no caminho canônico: `test/v1/problem.test.ts` (9 categorias) e
  // `features/canonical-analysis/data/errorView.test.ts` (`authentication_required` →
  // `sign_in`, e só ele limpa a sessão).
] as const;

/** Lista para `test.exclude` do vitest (derivada da fonte única). */
export const QUARANTINE_FILES: readonly string[] = QUARANTINE.map((q) => q.file);
