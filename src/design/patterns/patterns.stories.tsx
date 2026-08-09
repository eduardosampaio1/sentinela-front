// M15 — os PATTERNS: estados, semântica única e as peças da M13.
//
// As invocações são as MESMAS de `patterns.test.tsx`. Não é economia de digitação: uma story que
// monta o componente de um jeito que nenhum teste cobre mostra um caso que ninguém prova, e o
// revisor aprova o que viu enquanto o gate protege outra coisa.

import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "@/design/primitives";
import {
  ActionRequired,
  ActionRequiredSemOperacao,
  ComparisonRow,
  ComparisonRowQuebrada,
  ConfirmDestructive,
  DataTable,
  EmptyState,
  ErrorState,
  ESTADOS_DE_EIXO,
  ESTADOS_PUBLICOS,
  LoadingState,
  ProgressiveState,
  StatusBadge,
  Toolbar,
} from "./index";

const COPY = {
  en: "Nothing here yet — send a data set to get started",
  pt: "Nada aqui ainda — envie um conjunto de dados para começar",
} as const;

const copia = (ctx: { globals: Record<string, unknown> }) =>
  COPY[(ctx.globals.idioma as keyof typeof COPY) ?? "pt"];

const meta: Meta = {
  title: "Design System/2 · Patterns",
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

/**
 * Os DOIS vocabulários, lado a lado — e é assim que se vê por que eles não podem colapsar.
 *
 * `pending` não é estado público; `needs_mapping` não é estado de eixo. Um componente único com
 * `estado: string` aceitaria os dois indiferentemente, e a tela mostraria um estado que aquele
 * eixo nunca tem. A união discriminada do `StatusBadge` impede isso no tipo; esta story mostra o
 * conjunto completo para que a diferença seja visível, não só verificável.
 */
export const EstadosPublicos: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ESTADOS_PUBLICOS.map((e) => (
        <StatusBadge key={e} vocabulario="publico" estado={e} rotulo={e} />
      ))}
    </div>
  ),
};

export const EstadosDeEixo: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ESTADOS_DE_EIXO.map((e) => (
        <StatusBadge key={e} vocabulario="eixo" estado={e} rotulo={e} />
      ))}
    </div>
  ),
};

export const Vazio: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return <EmptyState titulo={t} explicacao={t} acao={<button>{t}</button>} />;
  },
};

export const Erro: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <ErrorState
        titulo={t}
        explicacao={t}
        acao="tentar"
        botao={<button>{t}</button>}
        detalhe="capacity_wait"
      />
    );
  },
};

/**
 * Carregando — o pattern onde o toggle **Movimento** muda o que se vê.
 *
 * Em `Normal`, o esqueleto pulsa a ≤ 1 Hz. Em `Reduzido`, ele para e o rótulo textual assume:
 * é a linha da tabela D34 que diz *"esqueleto pulsa → estático, com rótulo textual"*. Sem o
 * toggle, essa regra só existiria como texto na Constituição.
 */
export const Carregando: Story = {
  render: (_a, ctx) => <LoadingState rotulo={copia(ctx as never)} />,
};

export const ProgressoPorEixo: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <ProgressiveState
        eixos={[
          { id: "engine", rotulo: t, estado: "running", rotuloDoEstado: t },
          { id: "analytics", rotulo: t, estado: "withheld", rotuloDoEstado: t },
        ]}
      />
    );
  },
};

export const AcaoNecessaria: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <div className="space-y-6">
        <ActionRequired titulo={t} explicacao={t} rotuloDoEstado={t} acao={<button>{t}</button>} />
        {/* O mesmo estado, sem operação disponível: o motivo aparece no lugar do botão em vez de
            um botão que não faz nada. */}
        <ActionRequiredSemOperacao titulo={t} explicacao={t} rotuloDoEstado={t} motivo={t} />
      </div>
    );
  },
};

export const ConfirmacaoDestrutiva: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <ConfirmDestructive
        titulo={t}
        consequencias={<Text papel="corpo">{t}</Text>}
        rotuloDoCampo={t}
        nomeExigido="Produção"
        acao={(habilitado) => <button disabled={!habilitado}>{t}</button>}
      />
    );
  },
};

export const Tabela: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <DataTable
        legenda={t}
        colunas={[
          { chave: "a", rotulo: t, celula: (l: { a: string }) => l.a },
          { chave: "n", rotulo: t, celula: () => "1.234", numerica: true },
        ]}
        linhas={[{ a: t }]}
        chaveDaLinha={(l) => l.a}
      />
    );
  },
};

export const Comparacao: Story = {
  render: (_a, ctx) => {
    const t = copia(ctx as never);
    return (
      <div className="space-y-4">
        <ComparisonRow rotulo={t} antes="10" depois="12" base={t} delta="+2" />
        {/* Comparação quebrada: o motivo entra no lugar do delta. Um delta calculado sobre bases
            diferentes seria um número correto respondendo à pergunta errada. */}
        <ComparisonRowQuebrada rotulo={t} antes="10" depois="12" base={t} motivo={t} />
      </div>
    );
  },
};

export const BarraDeAcoes: Story = {
  render: (_a, ctx) => <Toolbar primaria={<button>{copia(ctx as never)}</button>} />,
};
