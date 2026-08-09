// M08 — a DÍVIDA DE COR LITERAL EM COMPONENTE, declarada e medida.
//
// D35 diz que valor literal em componente é defeito, não estilo. O piso, portanto, é ZERO — e o
// repositório está a **406 ocorrências em 28 arquivos** desse piso.
//
// Zerar isso agora seria migrar 28 superfícies numa missão cujo escopo é vocabulário de token, e
// a ordem explícita da M08 é **não migrar componentes em massa**. Migração de superfície legada
// acontece quando a superfície é reescrita (M10 em diante), com revisão visual — não por
// substituição cega de hex por token, que muda pixel sem ninguém olhar.
//
// O que muda hoje é que a dívida deixa de ser invisível:
//
//   • arquivo FORA desta lista precisa ter ZERO. É assim que "nenhum novo `#hex` nasce em
//     componente" vira gate em vez de combinado;
//   • arquivo DENTRO da lista não pode crescer;
//   • quando encolher, a lista tem de encolher junto — senão vira folclore, e um número que
//     ninguém atualiza rapidamente para de significar qualquer coisa.
//
// Os dois primeiros da lista são os monólitos de D17, que têm missão própria e cujo bloqueio de
// >1.000 linhas já é medido pelo gate anti-monólito.

/** Ocorrências de cor literal por arquivo de produto, medidas em M08 (2026-08-09). */
export const HARDCODE_DECLARADO: Readonly<Record<string, number>> = {
  "src/features/landing/LandingPage.tsx": 78,
  "src/features/aion/AionPage.tsx": 33,
  "src/features/auth/LoginPage.tsx": 31,
  "src/features/profile/ProfilePage.tsx": 23,
  "src/features/settings/SettingsPage.tsx": 21,
  "src/features/history/HistoryPage.tsx": 20,
  "src/features/history/RunRow.tsx": 19,
  "src/features/history/RunComparePanel.tsx": 17,
  "src/features/auth/ForgotPasswordPage.tsx": 15,
  "src/features/auth/RegisterPage.tsx": 15,
  "src/shell/AuthShell.tsx": 15,
  "src/features/launchpad/AnalysisLauncher.tsx": 13,
  "src/features/launchpad/LaunchpadPage.tsx": 13,
  "src/shared/states/ErrorState.tsx": 12,
  "src/features/errors/NotFoundPage.tsx": 10,
  "src/features/errors/ServerErrorPage.tsx": 10,
  "src/core/errors/ErrorBoundary.tsx": 9,
  "src/features/launchpad/RecentRuns.tsx": 8,
  "src/features/auth/SessionExpiredPage.tsx": 7,
  "src/features/legal/LegalPage.tsx": 7,
  "src/shared/feedback/ConfirmDialog.tsx": 6,
  "src/shared/states/EmptyState.tsx": 6,
  "src/components/auth/AuthExperienceShell.tsx": 4,
  "src/features/auth/KeycloakRedirect.tsx": 4,
  "src/shared/layout/PageHeader.tsx": 4,
  "src/shared/states/SkeletonState.tsx": 3,
  "src/shell/MobileNav.tsx": 2,
  "src/app/router.tsx": 1,
} as const;

/** Total declarado — só para a mensagem de falha dizer de quanto para quanto. */
export const HARDCODE_TOTAL = Object.values(HARDCODE_DECLARADO).reduce((a, b) => a + b, 0);
