// M15 — o ambiente das stories.
//
// Três controles globais, e cada um existe porque uma autoridade congelada exige que aquilo seja
// **exercitável**, não descrito:
//
//   • **idioma** (D37) — PT-BR chega ~30 % mais longo que EN. O DS não traduz: ele recebe a
//     palavra por prop. Então o toggle troca a COPY que as stories passam, que é exatamente o que
//     acontece em produção.
//   • **movimento** (D34) — `prefers-reduced-motion` é preferência do sistema operacional, e
//     ninguém vai trocar a configuração do SO para revisar um componente. O decorator aplica a
//     MESMA regra que `globals.css` aplica, para que o comportamento reduzido seja visível aqui.
//   • **viewport** (A3) — desktop e mobile, porque a marginália muda de forma entre os dois e o
//     mobile é onde esse tipo de pattern falha em silêncio.

import type { Decorator, Preview } from "@storybook/react";
import * as React from "react";

// Os tokens PRIMEIRO: `globals.css` só contém apelidos que apontam para estes papéis.
import "../src/design/tokens/tokens.css";
import "../src/styles/globals.css";

/**
 * Reduced motion, replicando a D34 — preserva a informação, remove o deslocamento.
 *
 * Deliberadamente idêntico ao bloco de `globals.css`: se as duas regras divergirem, o Storybook
 * passa a mostrar um comportamento que a aplicação não tem, e revisar aqui deixa de significar
 * alguma coisa. A duplicação é o preço de tornar exercitável uma preferência do SO.
 */
const CSS_MOVIMENTO_REDUZIDO = `
  *, *::before, *::after {
    transition-property: opacity, color, background-color, border-color, fill, stroke,
      box-shadow, outline-color !important;
    transition-duration: var(--ds-duration-fast) !important;
    transition-timing-function: var(--ds-easing-standard) !important;
    animation-duration: var(--ds-duration-instant) !important;
    animation-iteration-count: 1 !important;
  }
`;

const comMovimento: Decorator = (Story, ctx) => {
  const reduzido = ctx.globals.movimento === "reduzido";
  return (
    <>
      {reduzido ? <style data-testid="movimento-reduzido">{CSS_MOVIMENTO_REDUZIDO}</style> : null}
      <div className="bg-background p-6 text-foreground">
        <Story />
      </div>
    </>
  );
};

const preview: Preview = {
  globalTypes: {
    idioma: {
      description: "Idioma da copy que as stories passam ao DS (D37: PT-BR ~+30 % vs EN)",
      defaultValue: "pt",
      toolbar: {
        title: "Idioma",
        items: [
          { value: "pt", title: "PT-BR" },
          { value: "en", title: "EN" },
        ],
      },
    },
    movimento: {
      description: "prefers-reduced-motion (D34)",
      defaultValue: "normal",
      toolbar: {
        title: "Movimento",
        items: [
          { value: "normal", title: "Normal" },
          { value: "reduzido", title: "Reduzido" },
        ],
      },
    },
  },
  decorators: [comMovimento],
  parameters: {
    layout: "fullscreen",
    viewport: {
      viewports: {
        mobile: { name: "Mobile (375)", styles: { width: "375px", height: "812px" } },
        desktop: { name: "Desktop (1280)", styles: { width: "1280px", height: "800px" } },
      },
    },
    a11y: {
      // O `axe` de verdade, no navegador de verdade. `color-contrast` fica LIGADO aqui — é o
      // contrário do que a suíte faz, e pelo motivo oposto: lá o jsdom não computa cor e a regra
      // reportaria "incomplete" como se fosse aprovação.
      config: {},
      options: { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } },
    },
  },
};

export default preview;
