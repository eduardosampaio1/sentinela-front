import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { AnalysisIntake } from "@/lib/v1";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";
import { MapaDoDenominador } from "./MapaDoDenominador";

const resizeObserverOriginal = globalThis.ResizeObserver;

function snapshot(overrides: Partial<SnapshotAnalitico> = {}): SnapshotAnalitico {
  return {
    snapshot_contract_version: "analytics-snapshot-v9",
    record_count: 100,
    measure_definitions: [],
    numeric: [],
    distributions: [],
    dimensions: [],
    concentrations: [],
    time_series: [],
    flag_crosses: [],
    numeric_crosses: [],
    flag_series: [],
    numeric_series: [],
    blocosNaoApresentados: 0,
    medidasNaoResumidas: 0,
    medidasNaoAutorizadas: 0,
    blocosIlegiveis: 0,
    ...overrides,
  };
}

function intake(overrides: Partial<AnalysisIntake> = {}): AnalysisIntake {
  return {
    source_record_count: 120,
    canonical_record_count: 100,
    rejected_record_count: 20,
    rejected_record_reasons: [],
    acceptance_policy: "threshold",
    acceptance_rule: { policy: "threshold", min_valid_ratio: 0.95, min_valid_records: 100 },
    accepted: true,
    privacy_clearance: "passed",
    ...overrides,
  };
}

function renderizar(
  visao: SnapshotAnalitico = snapshot(),
  recebimento: AnalysisIntake | null = intake(),
) {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <MapaDoDenominador snapshot={visao} intake={recebimento} />
    </LanguageProvider>,
  );
}

afterEach(() => {
  if (resizeObserverOriginal) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: resizeObserverOriginal,
    });
    return;
  }
  Reflect.deleteProperty(globalThis, "ResizeObserver");
});

describe("MapaDoDenominador", () => {
  it("mantém um rastro legível quando o React Flow não pode montar", () => {
    Reflect.deleteProperty(globalThis, "ResizeObserver");

    renderizar(
      snapshot({
        blocosNaoApresentados: 2,
        medidasNaoResumidas: 1,
        blocosIlegiveis: 3,
      }),
    );

    const lista = screen.getByRole("list");
    expect(within(lista).getByText("Base recebida")).toBeInTheDocument();
    expect(within(lista).getByText("120")).toBeInTheDocument();
    expect(within(lista).getByText("Conversas aceitas")).toBeInTheDocument();
    expect(within(lista).getAllByText("100")).toHaveLength(2);
    expect(within(lista).getByText("Só como contagem")).toBeInTheDocument();
    expect(within(lista).getByText("20")).toBeInTheDocument();
    expect(within(lista).getByText("Blocos não apresentados")).toBeInTheDocument();
    expect(within(lista).getByText("2")).toBeInTheDocument();
    expect(within(lista).getByText("Não resumidas")).toBeInTheDocument();
    expect(within(lista).getByText("1")).toBeInTheDocument();
    expect(within(lista).getByText("Blocos ilegíveis")).toBeInTheDocument();
    expect(within(lista).getByText("3")).toBeInTheDocument();
  });
});
