// M15 — a MARGINÁLIA, que é onde a linguagem visual do Sentinela fica reconhecível.
//
// ## De onde vêm os números — e a lição que custou uma rodada
//
// O DoD da M15 diz *"nenhuma story declara payload"*. A primeira versão destas stories levou isso
// ao pé da letra e importou `statusView()` da fixture do contrato. O gate da M04 ficou vermelho, e
// estava certo: o caminho `fixtures/public-v1/analyses` carrega domínio, e o Design System não
// pode conhecê-lo.
//
// A leitura correta é que **não há payload aqui para declarar**. O `ProvenanceMargin` recebe
// `{ rotulo, valor }` genéricos, já formatados — ele não consome resposta de backend, por
// construção. Onde não há payload, não há cenário a escolher; há copy e valor de apresentação,
// que é exatamente o que a camada de produto passa em produção.
//
// A regra do DoD vale para os patterns que consumirem payload quando a **M18** criar
// `scenarios/`. Aplicá-la onde ela não cabe produziu a violação, não a evitou.
//
// ## Por que as duas viewports importam aqui
//
// Este é o pattern que a A3 obriga a provar no mobile. Trocar a viewport na barra do Storybook
// mostra a margem persistente virando disclosure — e é a única forma de um revisor VER que a
// procedência não sumiu, em vez de acreditar que não sumiu.

import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "@/design/primitives";
import { ProvenanceMargin } from "./ProvenanceMargin";

const COPY = {
  en: {
    indicador: "Conformity rate",
    margem: "Provenance",
    ausente: "Not reported",
    registros: "Records",
    metodo: "Method",
    metodoValor: "Direct count",
  },
  pt: {
    indicador: "Taxa de conformidade",
    margem: "Procedência",
    ausente: "Não informado",
    registros: "Registros",
    metodo: "Método",
    metodoValor: "Contagem direta",
  },
} as const;

const copia = (ctx: { globals: Record<string, unknown> }) =>
  COPY[(ctx.globals.idioma as keyof typeof COPY) ?? "pt"];

/**
 * Os valores que a margem exibe — já formatados, como o DS sempre os recebe.
 *
 * A primeira versão destas stories importava `statusView()` da fixture do contrato, para "não
 * inventar payload". Era o erro oposto ao que o DoD quer evitar: o `ProvenanceMargin` **não
 * consome payload** — ele recebe `{ rotulo, valor }` genéricos — e trazer a fixture para cá fez o
 * Design System conhecer domínio. O gate da M04 reprovou, e com razão.
 *
 * Não há cenário a escolher aqui porque não há payload a escolher. O que existe é copy e valor
 * de apresentação, e é isso que a camada de produto passa em produção.
 */
const VALOR_EXIBIDO = "1.234";

const meta: Meta<typeof ProvenanceMargin> = {
  title: "Design System/3 · ProvenanceMargin",
  component: ProvenanceMargin,
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj<typeof ProvenanceMargin>;

export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: "desktop" } },
  render: (_a, ctx) => {
    const c = copia(ctx as never);
    return (
      <ProvenanceMargin
        rotuloDoIndicador={c.indicador}
        rotuloDaMargem={c.margem}
        textoQuandoAusente={c.ausente}
        procedencia={[
          { rotulo: c.registros, valor: VALOR_EXIBIDO },
          { rotulo: c.metodo, valor: c.metodoValor },
        ]}
      >
        <Text papel="destaque" numerico>
          63,0%
        </Text>
      </ProvenanceMargin>
    );
  },
};

/** A MESMA story na viewport pequena: a margem colapsa e continua presa ao dado. */
export const Mobile: Story = {
  ...Desktop,
  parameters: { viewport: { defaultViewport: "mobile" } },
};

/**
 * Procedência parcialmente desconhecida.
 *
 * `valor: null` vira a palavra do produto — nunca `0`, nunca `—` inventado. Um zero no lugar de
 * um desconhecido é a tela afirmando algo que ninguém mediu.
 */
export const ComCampoAusente: Story = {
  render: (_a, ctx) => {
    const c = copia(ctx as never);
    return (
      <ProvenanceMargin
        rotuloDoIndicador={c.indicador}
        rotuloDaMargem={c.margem}
        textoQuandoAusente={c.ausente}
        procedencia={[
          { rotulo: c.registros, valor: null },
          { rotulo: c.metodo, valor: c.metodoValor },
        ]}
      >
        <Text papel="destaque" numerico>
          63,0%
        </Text>
      </ProvenanceMargin>
    );
  },
};

/**
 * Nenhuma procedência conhecida — e a margem **não some**.
 *
 * Não saber de onde o número veio não é uma procedência ruim; é desconhecimento, e ele é
 * declarado. A margem que sumisse devolveria o indicador à solidão que a V9 existe para fechar.
 */
export const SemProcedencia: Story = {
  render: (_a, ctx) => {
    const c = copia(ctx as never);
    return (
      <ProvenanceMargin
        rotuloDoIndicador={c.indicador}
        rotuloDaMargem={c.margem}
        textoQuandoAusente={c.ausente}
        procedencia={[]}
      >
        <Text papel="destaque" numerico>
          63,0%
        </Text>
      </ProvenanceMargin>
    );
  },
};
