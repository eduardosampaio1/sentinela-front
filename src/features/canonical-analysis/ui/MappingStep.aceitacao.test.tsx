// A escolha da política chega a quem confirma — ou não chega.
//
// ## Por que este arquivo existe
//
// Ele é o buraco que eu deixei. Escrevi um teste do `MappingStep` inventando a forma de
// `MappingView`, ele quebrou em runtime, e eu o troquei por um teste no nível do cliente — que
// prova o body que o cliente monta, e NÃO que a tela entrega a escolha ao cliente.
//
// O elo sem cobertura é exatamente onde a prova em homologação falhou: a análise
// `ad8acf59-b69f-4fc0-aa35-564a3592d056` foi confirmada com o rádio de 95% marcado, e o Ingestion
// registrou `requested_policy = strict`.
//
// Este arquivo existe para responder de quem é a culpa, com a forma REAL do contrato.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { MappingView } from "@/lib/v1";

import { MappingStep } from "./MappingStep";

/** A forma REAL de `MappingView`, com os dois campos obrigatórios já sugeridos. */
function mapa(): MappingView {
  return {
    requires_decision: true,
    records_observed: 61423,
    sample_truncated: true,
    format_id: "jsonl",
    columns: [
      { name: "conversation_id", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 29 },
      { name: "assistant_text", name_redacted: false, types: ["string"], coverage: 1, distinct_values: 21 },
    ],
    suggestion: {
      conversation_id: { source: "conversation_id" },
      assistant_text: { source: "assistant_text" },
    },
    ambiguous: {},
    required_fields: ["conversation_id", "assistant_text"],
    optional_fields: [],
    groupable_fields: [],
  };
}

function montar(aoConfirmar: (r: unknown, g: unknown, m: number | undefined) => Promise<void>) {
  return render(
    <LanguageProvider>
      <MappingStep mapa={mapa()} aoConfirmar={aoConfirmar} />
    </LanguageProvider>,
  );
}

describe("MappingStep · a escolha da política chega a quem confirma", () => {
  it("escolher 95% entrega 0.95 ao confirmar", async () => {
    // O caso que a prova em homologação deixou em dúvida. Com `userEvent`, o clique passa pelo
    // React como um clique de gente passa — se ele falhar aqui, o defeito é do produto.
    const usuario = userEvent.setup();
    const recebido: Array<number | undefined> = [];
    montar(async (_r, _g, m) => {
      recebido.push(m);
    });

    await usuario.click(screen.getByRole("radio", { name: /95%/i }));
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(recebido).toEqual([0.95]);
  });

  it("escolher o estrito entrega 1, e não ausência", async () => {
    // O conserto do achado MÉDIO da revisão: quem escolhe o estrito ENVIA essa escolha, em vez
    // de delegar a um default que não viu.
    const usuario = userEvent.setup();
    const recebido: Array<number | undefined> = [];
    montar(async (_r, _g, m) => {
      recebido.push(m);
    });

    await usuario.click(screen.getByRole("radio", { name: /reject the whole file/i }));
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(recebido).toEqual([1]);
  });

  it("não escolher entrega `undefined`, e a chave nem viaja", async () => {
    const usuario = userEvent.setup();
    const recebido: Array<number | undefined> = [];
    montar(async (_r, _g, m) => {
      recebido.push(m);
    });

    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(recebido).toEqual([undefined]);
  });

  it("os dois rádios têm NOME ACESSÍVEL, e não `on`", async () => {
    // Medido em homologação: a árvore de acessibilidade expunha UM nó chamado "on" onde há dois
    // rádios. Um leitor de tela anuncia "on", que não diz nada — WCAG 4.1.2.
    //
    // `getByRole("radio", { name: ... })` falha se o nome acessível não for o texto visível, o
    // que faz deste caso o gate da correção.
    montar(vi.fn());

    expect(screen.getByRole("radio", { name: /reject the whole file/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /95%/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});

describe("MappingStep · acessibilidade da escolha", () => {
  it("o axe nao acusa violacao na secao de aceitacao", async () => {
    // A arvore de acessibilidade da MINHA ferramenta de automacao mostrou um unico no chamado
    // "on" onde ha dois radios, e eu quase registrei isso como defeito de produto.
    //
    // O axe e a autoridade, e o `getByRole` acima ja encontra os dois pelo texto visivel. Este
    // caso existe para que a duvida nao volte: se algum dia o nome acessivel sumir de verdade,
    // ele fica vermelho aqui — e nao numa leitura de ferramenta que usa o `value` do input.
    const axe = (await import("axe-core")).default;
    const { container } = montar(vi.fn());

    const resultado = await axe.run(container, {
      runOnly: ["wcag2a", "wcag2aa"],
    });

    const violacoes = resultado.violations.map((v) => `${v.id}: ${v.help}`);
    expect(violacoes).toEqual([]);
  });
});
