// Tokens visuais da página do AION.
//
// Extraídos de `AionPage.tsx` na M46. O motivo é o mesmo que a catraca anti-monólito persegue: o
// arquivo tem ~1180 linhas e a régua da casa é 400. Esta extração não conserta o monólito — ela
// tira dele a peça mais reutilizada e mais consultada, que é a paleta.
//
// A extração também tem um efeito prático imediato: `muted` respondia sozinho por 76 nós de a11y
// reprovados, e um token que mora num arquivo de 1180 linhas é um token que ninguém revisa.

/** Paleta da página. Todas as razões abaixo são medidas contra os fundos desta mesma paleta. */
export const A = {
  bg:         "#0B1120",
  surface:    "#141B2D",
  surfaceAlt: "#1A2236",
  border:     "#1E293B",
  primary:    "#14B8A6",
  cta:        "#0EA5E9",
  text:       "#E2E8F0",
  /**
   * M46 — era `#64748B`.
   *
   * Compunha entre 3.32:1 e 3.97:1 contra os SEIS fundos desta página e reprovava em **76 nós** —
   * mais que as quatro superfícies públicas da M45.7 somadas. Não eram 76 defeitos: era um token,
   * usado 76 vezes.
   *
   * `#8695AD` mede 5.22:1 no pior fundo (`surfaceAlt`) e 6.20:1 no melhor (`bg`).
   */
  muted:      "#8695AD",
  amber:      "#EAB308",
  nomos:      "#38BDF8",
  estixe:     "#2DD4BF",
  metis:      "#A78BFA",
  nemos:      "#EAB308",
};

export const display = { fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: "-0.022em" } as const;
export const mono    = { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" } as const;
