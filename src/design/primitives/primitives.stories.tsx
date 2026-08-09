// M15 — os PRIMITIVES, vistos.
//
// A copy não é inventada aqui: ela vem do mesmo par EN-curto × PT-longo que a suíte da M10 usa
// para exercitar o orçamento de +30 % de D37. Se a story escolhesse as próprias palavras, o
// Storybook mostraria um caso confortável que nenhum teste cobre — e o revisor aprovaria um
// layout que quebra no idioma real.

import type { Meta, StoryObj } from "@storybook/react";
import {
  Bar,
  Chip,
  DefinitionGrid,
  Disclosure,
  IconeDecorativo,
  IconeInformativo,
  Note,
  Panel,
  Stack,
  Text,
} from "./index";

/** O mesmo par de `primitives.test.tsx`. Uma fonte, dois consumidores. */
const COPY = {
  en: { curto: "Withheld", longo: "Distribution of observed categories" },
  pt: { curto: "Retida", longo: "Distribuição das categorias observadas" },
} as const;

const copia = (ctx: { globals: Record<string, unknown> }) =>
  COPY[(ctx.globals.idioma as keyof typeof COPY) ?? "pt"];

const meta: Meta = {
  title: "Design System/1 · Primitives",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

export const Texto: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <Stack espaco="md">
        <Text papel="destaque">{c.longo}</Text>
        <Text papel="titulo">{c.longo}</Text>
        <Text papel="corpo">{c.longo}</Text>
        <Text papel="rotulo" tom="discreto">
          {c.curto}
        </Text>
        <Text papel="corpo" numerico>
          1.234.567,89
        </Text>
      </Stack>
    );
  },
};

export const Chips: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <Stack direcao="horizontal" espaco="sm">
        <Chip enfase="neutro">{c.curto}</Chip>
        <Chip enfase="contorno">{c.curto}</Chip>
        <Chip enfase="solido">{c.curto}</Chip>
      </Stack>
    );
  },
};

export const Barras: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <ul className="space-y-2">
        <Bar rotulo={c.longo} valor="1.234" largura="63.0%" rotuloSuprimido={c.curto} />
        <Bar rotulo={c.longo} valor="412" largura="21.1%" rotuloSuprimido={c.curto} />
        {/* Suprimida: o valor NÃO vira zero. Barra sem número é diferente de barra em zero, e o
            primitive existe para que essa diferença não dependa de quem monta a tela. */}
        <Bar rotulo={c.longo} valor={null} largura="0%" suprimida rotuloSuprimido={c.curto} />
      </ul>
    );
  },
};

export const Grade: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <DefinitionGrid
        itens={[
          { label: c.curto, display: "1.234" },
          { label: c.longo, display: "63,0%" },
        ]}
      />
    );
  },
};

export const PainelComNota: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <Panel titulo={c.longo}>
        <Note>{c.longo}</Note>
      </Panel>
    );
  },
};

export const Revelar: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <Disclosure gatilho={c.curto}>
        <Text papel="corpo">{c.longo}</Text>
      </Disclosure>
    );
  },
};

export const Icones: Story = {
  render: (_args, ctx) => {
    const c = copia(ctx as never);
    return (
      <Stack direcao="horizontal" espaco="md">
        {/* Dois componentes, não um com flag: ícone informativo sem nome acessível é informação
            que o leitor de tela não recebe, e ícone decorativo anunciado é ruído. */}
        <IconeInformativo rotulo={c.curto}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="currentColor" />
          </svg>
        </IconeInformativo>
        <IconeDecorativo>
          <svg viewBox="0 0 16 16">
            <rect x="2" y="2" width="12" height="12" fill="currentColor" />
          </svg>
        </IconeDecorativo>
      </Stack>
    );
  },
};
