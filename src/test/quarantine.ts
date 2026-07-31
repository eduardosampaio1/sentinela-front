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
  {
    file: "src/test/authFlows.test.tsx",
    category: "dead-stack",
    reason: "Importa @/pages/Login (módulo de página removido; auth vivo em features/auth/*). Erro de coleção.",
    debtId: "SENT-FE-E1-Q1",
    ancora: "@/pages/Login",
  },
  {
    file: "src/test/homePageFlow.test.tsx",
    category: "dead-stack",
    reason: "Importa @/pages/HomePage (substituído por HomeWelcomePage/launchpad). Erro de coleção.",
    debtId: "SENT-FE-E1-Q2",
    ancora: "@/pages/HomePage",
  },
  {
    file: "src/test/economicsRendering.test.tsx",
    category: "dead-stack",
    reason: "buildEconomicsPanelModel (@/lib/economicsModel) quebra em runtime (getUsefulRate is not a function) e CoreMetricsRow exige TooltipProvider ausente; indicador de economics legado fora de rota viva.",
    debtId: "SENT-FE-E1-Q3",
    ancora: "buildEconomicsPanelModel",
  },
  {
    file: "src/test/apiErrorFormatting.test.ts",
    category: "legacy-contract",
    reason: "Testa o formato de erro do cliente LEGADO lib/api (session-expired mascara a msg de auth do backend). E1 é proibida de tocar o cliente legado; a camada canônica usa problem+json.",
    debtId: "SENT-FE-E1-Q4",
    ancora: "surfaces a readable backend auth configuration message",
  },
] as const;

/** Lista para `test.exclude` do vitest (derivada da fonte única). */
export const QUARANTINE_FILES: readonly string[] = QUARANTINE.map((q) => q.file);
