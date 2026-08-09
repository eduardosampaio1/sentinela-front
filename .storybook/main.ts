// M15 — Storybook do DESIGN SYSTEM canônico.
//
// ## Por que o glob é estreito
//
// `src/design/**` e mais nada. Um Storybook que varre `src/**` vira catálogo dos componentes
// legados de `src/components/ui/` — e catálogo de legado é pior que nenhum catálogo: ele publica
// como referência exatamente o que a M10 registrou que **não** deve ser copiado, e a próxima
// pessoa monta a tela nova a partir dali.
//
// ## Por que só agora
//
// O Storybook esperou a M16 de propósito (`Pré: M13, M16`). Antes dela não havia infraestrutura
// de mock no browser, e a saída óbvia — cada story inventando o próprio payload — teria criado o
// segundo universo de fixtures que a Fase 2 existe para impedir.

import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/design/**/*.stories.@(ts|tsx)"],
  addons: [
    // Viewport (o desktop/mobile que a A3 exige provar) + controls. Nada além do necessário.
    "@storybook/addon-essentials",
    // a11y com o motor REAL — o mesmo `axe` da suíte, rodando no navegador de verdade, onde ele
    // consegue computar cor. É a diferença que a M10 já teve de registrar: no jsdom a regra
    // `color-contrast` fica *incomplete* e desligá-la é honesto; aqui ela funciona.
    "@storybook/addon-a11y",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
};

export default config;
