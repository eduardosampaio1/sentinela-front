// A landing DEIXOU de ter paleta própria — decisão de owner, 2026-08-17.
//
// O design do protótipo aprovado passou a ser o padrão do site inteiro. Este arquivo era uma
// paleta paralela: `#09090b` zinc neutro, índigo `#5e6ad2`, cartões em branco translúcido — um
// dialeto de página, com valores que ninguém fora daqui revisava.
//
// Ele NÃO foi apagado, e a diferença importa: `C` é consumido como `style={{ color: C.muted }}`
// em três arquivos, 94 vezes. Reescrever os três consumidores para classe seria uma refatoração
// grande e arriscada para chegar ao mesmo lugar. Trocar os VALORES por referência aos tokens do
// sistema resolve as 94 de uma vez, e transforma o que era fonte de verdade em ADAPTADOR.
//
// A regra que fica: nenhuma cor nasce aqui. Toda entrada abaixo aponta para `tokens.css`.
//
// ## O que se perdeu na tradução, e por que a escolha é essa
//
// A landing tinha QUATRO degraus de texto (`text` > `muted` > `ghost` > `subtle`) e DOIS de cartão
// (`bgCard` > `bgCardStr`). O sistema tem três degraus de texto e uma escada de superfície com
// papéis definidos. Não cabe tudo, e algo tinha que colapsar.
//
// Colapsaram os CARTÕES, e o motivo é medido: `--ds-text-muted` dá 4,17:1 sobre `surface-overlay`
// — reprova AA. Se `bgCardStr` apontasse para `overlay`, qualquer rótulo `ghost`/`subtle` dentro
// dele cairia, e são rótulos de 9px, justamente onde a M46 gastou uma missão consertando 26 nós.
//
// Com os dois cartões em `raised`, o pior par fica em 4,57:1 e passa. A landing perde um degrau de
// profundidade e mantém os dois degraus de BORDA, que é de onde ela tira separação de verdade.
//
// ## As razões contra a base nova (#12161D), medidas antes de escrever
//
//   text    15,41    muted   8,16    ghost/subtle  4,91
//   accent   6,09    green   7,90    amber  8,32    red  5,97
//
// Todas passam AA. Três delas MELHORARAM em relação aos valores que a M46 escolheu à mão.
//
// ⚠️ `green` e `amber` do sistema colapsam em escala de cinza (1,05 de separação). Esta página usa
// as duas em gráfico E como texto em chip. Onde a distinção verde/âmbar carregar significado, ela
// precisa de rótulo ou forma — cor sozinha não serve, e aqui isso deixou de ser teoria.

/** Ponte para os tokens do sistema. NENHUM valor nasce neste arquivo. */
export const C = {
  // ── Superfícies ──────────────────────────────────────────────────────────────
  bg: "hsl(var(--ds-surface-base))",
  bgAlt: "hsl(var(--ds-surface-raised))",
  /** Os dois degraus de cartão colapsaram em `raised`. Ver a nota do cabeçalho. */
  bgCard: "hsl(var(--ds-surface-raised))",
  bgCardStr: "hsl(var(--ds-surface-raised))",

  // ── Bordas — os dois degraus SOBREVIVEM, e é deles que vem a separação ───────
  border: "hsl(var(--ds-border-subtle))",
  borderStr: "hsl(var(--ds-border-default))",

  // ── Texto ────────────────────────────────────────────────────────────────────
  text: "hsl(var(--ds-text-primary))",
  muted: "hsl(var(--ds-text-secondary))",
  /**
   * `ghost` e `subtle` também apontam para `text-secondary`, e isto CUSTOU um degrau.
   *
   * A primeira tentativa mandou os dois para `--ds-text-muted`, que passa AA sobre `base` (4,91) e
   * sobre `raised` (4,57). A matriz reprovou: cinco rótulos de 8–9px ficaram entre 4,04 e 4,3.
   *
   * O motivo é específico e não estava no meu radar — esses rótulos vivem DENTRO de chips tingidos
   * pela cor de marca do fornecedor (`rgba(204,120,92,0.14)` e irmãs). O fundo deixa de ser `base`
   * e vira um composto quente, e `text-muted` não tem folga para isso em 8px.
   *
   * Resultado: a landing tinha QUATRO degraus de texto e agora tem DOIS. É perda real, e o
   * caminho de volta não é um remendo aqui — é decidir se o sistema quer um quarto papel de texto,
   * medido contra superfície TINGIDA e não só contra as três do sistema. Decisão de design, não
   * de arquivo de ponte.
   */
  ghost: "hsl(var(--ds-text-secondary))",
  subtle: "hsl(var(--ds-text-secondary))",

  // ── Ação ─────────────────────────────────────────────────────────────────────
  accent: "hsl(var(--ds-accent))",
  /** Era `#828fff` escolhido à mão na M46 para dar 5,90:1. O token dá 6,09. */
  accentBr: "hsl(var(--ds-accent-ink))",
  /** V5: um acento só. O sistema não tem degrau de hover, e inventar um aqui recriaria o dialeto. */
  accentHov: "hsl(var(--ds-accent-ink))",
  accentBg: "hsl(var(--ds-accent) / 0.08)",
  accentBord: "hsl(var(--ds-accent) / 0.22)",

  // ── Sinais ───────────────────────────────────────────────────────────────────
  green: "hsl(var(--ds-success))",
  amber: "hsl(var(--ds-warning))",
  red: "hsl(var(--ds-danger))",
  greenBg: "hsl(var(--ds-success) / 0.08)",
  greenBord: "hsl(var(--ds-success) / 0.2)",
  amberBg: "hsl(var(--ds-warning) / 0.08)",
  amberBord: "hsl(var(--ds-warning) / 0.22)",
  redBg: "hsl(var(--ds-danger) / 0.07)",
  redBord: "hsl(var(--ds-danger) / 0.2)",
};

// As famílias saem da MESMA fonte que o Tailwind declara. `'Inter'` estava aqui e nunca carregou:
// a CSP não permite CDN de fonte, então o navegador caía no fallback do sistema sem ninguém saber.
// Agora aponta para o que o produto realmente tem.
export const display: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  fontFeatureSettings: '"cv01", "ss03"',
};
export const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};

/**
 * Os papéis de cor que um `Tag` pode vestir.
 *
 * Mora aqui, e não em `primitivos.tsx`, por um motivo mecânico: arquivo que exporta componente E
 * tipo acorda o `react-refresh/only-export-components`, e o lint tem catraca desde a M46. Como
 * papel de cor, o lugar dele é o vocabulário mesmo.
 */
export type TagColor = "cyan" | "amber" | "red" | "green" | "purple";
