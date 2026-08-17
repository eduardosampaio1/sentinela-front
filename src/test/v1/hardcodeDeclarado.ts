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

/**
 * Ocorrências de cor literal por arquivo de produto.
 *
 * Medidas em M08 (406 em 28 arquivos) e **reduzidas pela M02**: a erradicação do Supabase Auth
 * apagou os formulários mortos de `LoginPage`, `ForgotPasswordPage`, `RegisterPage` e
 * `ResetPasswordPage`, e com eles o hardcode que moravam dentro. A lista encolheu junto, como o
 * gate exige.
 */
export const HARDCODE_DECLARADO: Readonly<Record<string, number>> = {
  // M46 — a dívida dos dois monólitos foi PARTIDA, não aumentada.
  //
  // Os blocos de tokens saíram para `tokens.ts` ao lado de cada página, porque a catraca
  // anti-monólito recusou o crescimento que as correções de a11y exigiam. As somas conservam
  // exatamente os números anteriores:
  //
  //   landing: 54 + 24 = 78  (era 78 num arquivo só)
  //   aion:    20 + 13 = 33  (era 33 num arquivo só)
  //
  // Nenhum literal novo nasceu. E agora eles moram num arquivo de 60 linhas, onde dá para revisar,
  // em vez de no meio de 1200 — que é como `#64748B` reprovou 76 nós sem ninguém notar.
  "src/features/landing/LandingPage.tsx": 0,
  "src/features/landing/casca.tsx": 3,
  "src/features/landing/primitivos.tsx": 0,
  "src/features/landing/PainelArgos.tsx": 3,
  "src/features/landing/topo.tsx": 14,
  "src/features/landing/secoes-problema.tsx": 2,
  "src/features/landing/secoes-jornada.tsx": 5,
  "src/features/landing/secoes-conversao.tsx": 0,
  "src/features/aion/casca.tsx": 0,
  "src/features/aion/primitivos.tsx": 0,
  "src/features/aion/DemoInterativa.tsx": 4,
  "src/features/aion/DiagramaDeFluxo.tsx": 2,
  "src/features/aion/secoes-topo.tsx": 2,
  "src/features/aion/secoes-modulos.tsx": 0,
  "src/features/aion/secoes-integracao.tsx": 11,
  "src/features/aion/ContactSection.tsx": 1,
  "src/features/landing/tokens.ts": 0,
  "src/features/aion/tokens.ts": 13,
  "src/features/aion/AionPage.tsx": 0,
  // `ProfilePage.tsx` SAIU: 23 → 0, a maior dívida individual da lista.
  //
  // Como nas outras, o hardcode morreu junto com o que o carregava — e aqui o que o carregava
  // era um formulário de senha INALCANÇÁVEL. `supportsPasswordForms()` é false desde o Keycloak,
  // então o submit redirecionava antes de qualquer validação: os dois campos, as três mensagens
  // e o botão "Update password" pintavam uma promessa que a SPA não cumpre.
  "src/features/history/RunRow.tsx": 19,
  "src/features/history/RunComparePanel.tsx": 17,
  "src/shell/AuthShell.tsx": 15,
  // 13 → 4. Os quatro que ficam são as cores da MARCA do Google dentro do ícone dele. Não são
  // escolha de design nossa e não podem virar token: um `--ds-` para o amarelo do Google seria o
  // vocabulário do sistema aprendendo a identidade de terceiro. O ícone do GitHub usa
  // `currentColor` e já não custa nenhum.
  "src/features/auth/LoginPage.tsx": 4,
  "src/shared/states/ErrorState.tsx": 12,
  // As duas páginas de estado terminal SAÍRAM da lista: 10 + 10 → 0.
  //
  // Não foi substituição cega de hex por token, que é o que esta lista existe para desencorajar.
  // Elas foram reescritas sobre o arquétipo TERMINAL, e o hardcode morreu junto com a composição
  // que o carregava — o ícone decorativo de 16×16, o bloco monoespaçado de detalhe técnico e as
  // seis tintas literais que pintavam texto centrado. O que sobrou não tem cor própria.
  "src/core/errors/ErrorBoundary.tsx": 9,
  // `SessionExpiredPage` (7 → 0) e `KeycloakRedirect` (4 → 0) SAÍRAM. As duas viraram o
  // arquétipo PORTAL, e o hardcode morreu junto com o que o carregava: o ícone decorativo de
  // 16×16 que gastava a maior área da tela para dizer "relógio", e as tintas literais de botão.
  // `LegalPage.tsx` SAIU: 7 → 0. Um arquivo, três rotas — a mesma aritmética que fez a M46
  // descobrir que 27 nós de contraste eram UM template contado três vezes.
  //
  // O objeto `L` de sete cores existia porque em M46 não havia vocabulário para vestir aqueles
  // papéis. Agora há, e junto com ele foi embora o `<style>` injetado em runtime que interpolava
  // as cores de dentro do JS — uma terceira folha de estilo nascendo, um nível acima de onde o
  // vocabulário único a tinha matado.
  "src/shared/feedback/ConfirmDialog.tsx": 6,
  "src/shared/states/EmptyState.tsx": 6,
  // `AuthExperienceShell.tsx` foi REMOVIDO (4 → 0). Ele existia só para o callback, e o callback
  // parou de usá-lo: uma casca institucional com três blocos explicando a mecânica de OIDC não
  // tem função numa tela por onde a pessoa passa em 800 ms. Sem consumidor em toda a árvore, ele
  // é peça escrita e nunca mais ligada — o tipo de arquivo que sobrevive porque compila.
  "src/shared/layout/PageHeader.tsx": 4,
  "src/shared/states/SkeletonState.tsx": 3,
  "src/shell/MobileNav.tsx": 2,
  "src/app/router.tsx": 1,
} as const;

/** Total declarado — só para a mensagem de falha dizer de quanto para quanto. */
// M41 — `SettingsPage.tsx` SAIU da lista: ela tinha 21 literais e passou a zero quando a
// superfície canônica da conta foi reescrita. A entrada não fica com `0` porque arquivo sem
// dívida não é dívida declarada — e a lista existe para encolher.
export const HARDCODE_TOTAL = Object.values(HARDCODE_DECLARADO).reduce((a, b) => a + b, 0);
