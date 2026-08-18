// Tokens visuais da página do AION — o CROMO agora vem do sistema; a MARCA, não.
//
// Extraídos de `AionPage.tsx` na M46, pelo mesmo motivo que a catraca anti-monólito persegue: o
// arquivo tem ~1180 linhas e a régua da casa é 400.
//
// ## O que mudou, e o que deliberadamente NÃO mudou
//
// A decisão de owner de 2026-08-17 fez o protótipo do Diagnóstico virar o padrão do site. As
// superfícies, bordas e texto desta página passaram a apontar para `tokens.css`: elas são CROMO —
// fundo, borda, tinta —, e cromo divergente por página é o dialeto que a troca vem apagar.
//
// Ficaram literais, e cada grupo por um motivo diferente:
//
//   `primary` e `cta`     são a MARCA do AION. Teal e ciano, não o índigo do Sentinela. Pintar a
//                         página do AION com o acento do Sentinela apagaria a identidade de um
//                         produto para uniformizar a de outro — e isso é decisão de produto, não
//                         de refatoração de token. AGUARDA DECISÃO DO OWNER.
//
//   `nomos`, `estixe`,    são TAXONOMIA: cada uma nomeia um módulo do AION, do mesmo jeito que a
//   `metis`, `nemos`      cor de um fornecedor de LLM o nomeia na landing. Substituí-las por
//                         tokens semânticos faria dois módulos ficarem da mesma cor, e a cor é o
//                         que os distingue no diagrama. AGUARDA DECISÃO DO OWNER.
//
// ## `muted` mudou de degrau, e o motivo é medido
//
// A M46 escolheu `#64748B` → `#8695AD` porque o primeiro reprovava em **76 nós** — um token usado
// 76 vezes, não 76 defeitos. Apontá-lo agora para `--ds-text-muted` recriaria o problema: aquele
// token dá 4,17:1 sobre `surface-overlay`, abaixo de AA.
//
// Ele aponta para `--ds-text-secondary`, que dá folga sobre as três superfícies desta página. A
// landing pagou exatamente esta lição algumas horas antes, com cinco rótulos de 8px.

/** Ponte para os tokens do sistema. Nenhuma cor de CROMO nasce aqui. */
export const A = {
  bg: "hsl(var(--ds-surface-base))",
  surface: "hsl(var(--ds-surface-raised))",
  surfaceAlt: "hsl(var(--ds-surface-overlay))",
  border: "hsl(var(--ds-border-default))",
  text: "hsl(var(--ds-text-primary))",
  /** `text-secondary`, não `text-muted`. Ver a nota do cabeçalho: `muted` reprova sobre `overlay`. */
  muted: "hsl(var(--ds-text-secondary))",

  // ── MARCA do AION — literal por decisão pendente ──────────────────────────
  primary: "#14B8A6",
  cta: "#0EA5E9",

  // ── TAXONOMIA dos módulos — literal porque a cor É o nome ──────────────────
  amber: "#EAB308",
  nomos: "#38BDF8",
  estixe: "#2DD4BF",
  metis: "#A78BFA",
  nemos: "#EAB308",
};

// `'Inter'` saiu: a CSP não permite CDN de fonte, então o navegador caía no fallback do sistema sem
// ninguém saber. Aponta para a família que o produto realmente carrega.
export const display = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  letterSpacing: "-0.022em",
} as const;
// A pilha do SISTEMA. Antes nomeava 'JetBrains Mono', que saiu do import quando o
// Diagnostico adotou a mono do prototipo -- e nome de fonte que ninguem carrega e
// declaracao que mente, mesmo caindo no fallback declarado ao lado.
export const mono = { fontFamily: "ui-monospace, 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace" } as const;
