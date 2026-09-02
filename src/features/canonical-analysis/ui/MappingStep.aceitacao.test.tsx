// A política de qualidade chega a quem confirma.
//
// ## Por que este arquivo existe
//
// Ele é o buraco que eu deixei. Escrevi um teste do `MappingStep` inventando a forma de
// `MappingView`, ele quebrou em runtime, e eu o troquei por um teste no nível do cliente — que
// prova o body que o cliente monta, e NÃO que a tela entrega a escolha ao cliente.
//
// O elo sem cobertura é exatamente onde a prova em homologação falhou primeiro: a análise
// `ad8acf59-b69f-4fc0-aa35-564a3592d056` foi confirmada com o rádio de 95% marcado, e o Ingestion
// registrou `requested_policy = strict`. Depois, o produto decidiu que esses registros viram
// métrica de qualidade da base, não escolha agressiva no mapping.
//
// Este arquivo existe para responder de quem é a culpa, com a forma REAL do contrato.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProblemError, type MappingView } from "@/lib/v1";

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

function montarComMapa(
  mapaDaTela: MappingView,
  aoConfirmar: (
    r: unknown,
    g: unknown,
    m: number | undefined,
    o: { measureIds: string[]; dimensionIds: string[] },
    outcome: unknown,
    modelUsage: unknown,
  ) => Promise<void>,
) {
  return render(
    <LanguageProvider>
      <MappingStep mapa={mapaDaTela} aoConfirmar={aoConfirmar} />
    </LanguageProvider>,
  );
}

function montar(
  aoConfirmar: (
    r: unknown,
    g: unknown,
    m: number | undefined,
    o: { measureIds: string[]; dimensionIds: string[] },
    outcome: unknown,
    modelUsage: unknown,
  ) => Promise<void>,
) {
  return montarComMapa(mapa(), aoConfirmar);
}

describe("MappingStep · qualidade da base não vira decisão agressiva", () => {
  it("confirmar entrega 0.95 sem pedir escolha de rejeição", async () => {
    const usuario = userEvent.setup();
    const recebido: Array<number | undefined> = [];
    montar(async (_r, _g, m) => {
      recebido.push(m);
    });

    expect(screen.queryByRole("radio", { name: /reject the whole file/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /95%/i })).not.toBeInTheDocument();
    expect(screen.getByText(/outside the analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/named and counted/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(recebido).toEqual([0.95]);
  });

  it("a ausência de interação não omite mais a política", async () => {
    const usuario = userEvent.setup();
    const recebido: Array<number | undefined> = [];
    montar(async (_r, _g, m) => {
      recebido.push(m);
    });

    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(recebido).toEqual([0.95]);
  });

  it("não há mais controle de rádio para rejeitar o arquivo inteiro", async () => {
    montar(vi.fn());

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText(/reject the whole file/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/analyze anyway/i)).not.toBeInTheDocument();
  });

  it("não bloqueia confirmação por contagem observada no perfil", async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    montarComMapa(
      {
        ...mapa(),
        records_observed: 25,
        sample_truncated: false,
      },
      aoConfirmar,
    );

    expect(screen.queryByTestId("mapping-base-pequena")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
  });

  it("recusa de entrada na confirmação orienta revisar campos, não esperar", async () => {
    const usuario = userEvent.setup();
    montar(async () => {
      throw new ProblemError({
        type: "urn:sentinela:error:invalid_input",
        title: "Entrada inválida",
        status: 400,
        code: "invalid_input",
        detail: "mapping_rejected",
        instance: "corr-1",
        retryable: false,
      });
    });

    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByText(/check the selected fields/i)).toBeInTheDocument();
    expect(screen.queryByText(/try again in a moment/i)).not.toBeInTheDocument();
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

describe("MappingStep · catálogo canônico", () => {
  it("explica incompatibilidade e envia opt-out local sem alterar o catálogo", async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    montarComMapa(
      {
        ...mapa(),
        catalog_version: "2026-08-29",
        catalog_activation_summary: { eligible: 2, rejected_type: 1 },
        catalog_activation: [
          {
            kind: "measure",
            catalog_id: "response_time_ms",
            source: "response_time_ms",
            status: "eligible",
            expected_value_type: "numeric",
            observed_types: ["number"],
            reason_code: "exact_contract_match",
            group: "performance",
            direction: "higher_is_worse",
            detector_id: "slow_response",
          },
          {
            kind: "dimension",
            catalog_id: "channel",
            source: "channel",
            status: "eligible",
            expected_value_type: "categorical",
            observed_types: ["string"],
            reason_code: "canonical_field_mapped",
            group: "context",
            direction: "context_only",
            detector_id: null,
          },
          {
            kind: "measure",
            catalog_id: "turn_count",
            source: "turn_count",
            status: "rejected_type",
            expected_value_type: "numeric",
            observed_types: ["string"],
            reason_code: "incompatible_type",
            group: "volume",
            direction: "context_only",
            detector_id: null,
          },
        ],
      },
      aoConfirmar,
    );

    await usuario.click(screen.getByText(/recognized measures/i));
    expect(screen.getByText(/expected numeric, but found string/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole("checkbox", { name: "response_time_ms" }));
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(aoConfirmar).toHaveBeenCalledWith(
      expect.anything(),
      [],
      0.95,
      { measureIds: ["response_time_ms"], dimensionIds: [] },
      undefined,
      undefined,
    );
  });
});

describe("MappingStep · desfecho declarado", () => {
  it("envia coluna e vocabulário sem inferir valores desconhecidos", async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    montarComMapa(
      {
        ...mapa(),
        columns: [
          ...mapa().columns,
          { name: "status_final", name_redacted: false, types: ["string"], coverage: 0.9, distinct_values: 4 },
        ],
      },
      aoConfirmar,
    );

    await usuario.click(screen.getByText(/business outcome/i));
    await usuario.click(screen.getByRole("checkbox", { name: /outcome column/i }));
    await usuario.selectOptions(
      screen.getByRole("combobox", { name: /^outcome column$/i }),
      "status_final",
    );
    await usuario.type(screen.getByLabelText(/values that mean success/i), "resolved, converted");
    await usuario.type(screen.getByLabelText(/values that mean failure/i), "abandoned");
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(aoConfirmar).toHaveBeenCalledWith(
      expect.anything(),
      [],
      0.95,
      { measureIds: [], dimensionIds: [] },
      {
        source_column: "status_final",
        value_kind: "categorical",
        success_values: ["resolved", "converted"],
        failure_values: ["abandoned"],
        case_sensitive: false,
      },
      undefined,
    );
  });
});

describe("MappingStep · identidade e usage do modelo", () => {
  it("envia apenas a declaração e as colunas escolhidas, sem inventar usage", async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    montarComMapa(
      {
        ...mapa(),
        columns: [
          ...mapa().columns,
          { name: "prompt_tokens", name_redacted: false, types: ["number"], coverage: 1, distinct_values: 20 },
          { name: "completion_tokens", name_redacted: false, types: ["number"], coverage: 1, distinct_values: 20 },
        ],
      },
      aoConfirmar,
    );

    await usuario.click(screen.getByText(/model and billable usage/i));
    await usuario.click(screen.getByRole("checkbox", { name: /know which model/i }));
    await usuario.type(screen.getByLabelText(/^provider/i), "OpenAI");
    await usuario.type(screen.getByLabelText(/^exact model/i), "gpt-5-mini");
    await usuario.selectOptions(screen.getByLabelText(/input tokens/i), "prompt_tokens");
    await usuario.selectOptions(screen.getByLabelText(/output tokens/i), "completion_tokens");
    await usuario.click(screen.getByRole("button", { name: /confirm/i }));

    expect(aoConfirmar).toHaveBeenCalledWith(
      expect.anything(),
      [],
      0.95,
      { measureIds: [], dimensionIds: [] },
      undefined,
      {
        provider: "OpenAI",
        model_id: "gpt-5-mini",
        usage_columns: {
          input_tokens: "prompt_tokens",
          output_tokens: "completion_tokens",
        },
      },
    );
  });
});
