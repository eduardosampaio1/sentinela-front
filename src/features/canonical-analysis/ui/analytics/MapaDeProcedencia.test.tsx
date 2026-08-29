import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { CruzamentoComFlag } from "../../result/analyticsProjection";
import { MapaDeProcedencia } from "./MapaDeProcedencia";

describe("MapaDeProcedencia · cruzamentos", () => {
  it("explica um número publicado pela dimensão, componentes e método", () => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.localStorage.setItem("sentinela:language", "pt");
    const cruzamento: CruzamentoComFlag = {
      dimension_id: "channel",
      measure_id: "vague_response",
      groups_observed: 1,
      groups_suppressed: 0,
      suppression_applied: false,
      high_cardinality_suppressed: false,
      min_group_size: 5,
      privacy_policy_version: "p1",
      top_k: 10,
      max_tracked_categories: 50,
      method_id: "category_flag_cross",
      method_version: 1,
      method_parameters: {},
      method_definition_digest: "digest",
      rows: [
        {
          label: "whatsapp",
          true_count: 3,
          false_count: 7,
          null_count: 0,
          true_rate: 0.3,
        },
      ],
    };

    render(
      <LanguageProvider>
        <MapaDeProcedencia
          bloco={{ tipo: "cruzamento_flag", dado: cruzamento }}
          denominador={100}
        />
      </LanguageProvider>,
    );

    expect(screen.getAllByText("Cruzamento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("whatsapp").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("3 sim · 7 não · 0 nulos · taxa 0.3").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("category_flag_cross · v1").length,
    ).toBeGreaterThan(0);
  });
});
