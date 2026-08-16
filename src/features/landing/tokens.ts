// Tokens visuais da landing.
//
// Extraídos de `LandingPage.tsx` na M46, pelo mesmo motivo do AION: o arquivo tem ~1200 linhas e a
// régua da casa é 400. A extração não conserta o monólito — tira dele a peça mais consultada.
//
// Três destes tokens respondiam por 26 dos 43 nós de a11y reprovados da página, e um token que
// mora no meio de 1200 linhas é um token que ninguém revisa.

/** Superfícies, texto, acento e cores de estado. Razões medidas contra `bg`/`bgAlt`. */
export const C = {
  // Surfaces — Linear's luminance stacking
  bg:         "#09090b",
  bgAlt:      "#0f1011",
  bgCard:     "rgba(255,255,255,0.025)",
  bgCardStr:  "rgba(255,255,255,0.04)",

  // Borders
  border:     "rgba(255,255,255,0.06)",
  borderStr:  "rgba(255,255,255,0.1)",

  // Text — Linear's cool near-white palette
  text:       "#f7f8f8",
  muted:      "#a1a1aa", // 7.43:1 — sempre passou.
  /**
   * M46 — `ghost` era `#71717a` (3.94:1) e `subtle` era `#52525b` (2.46:1).
   *
   * Juntos respondiam por 26 dos 43 nós reprovados desta página, boa parte em rótulos de 9px —
   * onde a legibilidade já é exigente antes de qualquer regra. Os substitutos preservam os DOIS
   * degraus da hierarquia (`muted` > `ghost` > `subtle`), agora acima do piso.
   */
  ghost:      "#8b8b95", // 5.65:1
  subtle:     "#80808c", // 4.88:1

  // Single brand accent: Linear indigo-violet
  accent:     "#5e6ad2",
  accentBr:   "#828fff", // M46: era #7170ff, que dava 4.40:1 em chips de 9px. Agora 5.90:1.
  accentHov:  "#9ba6ff",
  accentBg:   "rgba(94,106,210,0.08)",
  accentBord: "rgba(94,106,210,0.22)",

  // Status colors — usadas em gráfico E como TEXTO em chips de 9px, que é onde reprovavam.
  green:      "#27a644",
  amber:      "#fbbf24", // M46: era #d97706 (4.36:1).
  red:        "#f87171", // M46: era #dc2626 (3.04:1). Agora 6.65:1.
  greenBg:    "rgba(39,166,68,0.08)",
  greenBord:  "rgba(39,166,68,0.2)",
  amberBg:    "rgba(217,119,6,0.08)",
  amberBord:  "rgba(217,119,6,0.22)",
  redBg:      "rgba(220,38,38,0.07)",
  redBord:    "rgba(220,38,38,0.2)",
};

// Inter Variable with Linear's OpenType features
export const display: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  fontFeatureSettings: '"cv01", "ss03"',
};
// JetBrains Mono for technical labels
export const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Berkeley Mono', ui-monospace, monospace",
};
