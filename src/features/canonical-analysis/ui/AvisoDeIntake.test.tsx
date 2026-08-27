// A recusa do dataset conta QUANTOS de QUANTOS.
//
// O caso real: 61.423 turnos entraram, 61.323 eram válidos, 100 foram recusados — e a tela
// mostrava "Couldn't complete". Medido em homologação em 2026-08-24 com base de atendimento.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";

import { AvisoDeIntake } from "./AvisoDeIntake";

function montar(intake: Parameters<typeof AvisoDeIntake>[0]["intake"]) {
  return render(
    <LanguageProvider>
      <AvisoDeIntake intake={intake} />
    </LanguageProvider>,
  );
}

describe("AvisoDeIntake", () => {
  it("conta quantos de quantos quando houve recusa", () => {
    montar({
      source_record_count: 61423,
      canonical_record_count: 61323,
      rejected_record_count: 100,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: null,
      accepted: false,
      privacy_clearance: "rejected",
    });

    const aviso = screen.getByTestId("intake-com-recusa");
    // Os três números aparecem. Sem eles a frase seria "alguns registros" — que é exatamente o
    // grau de vagueza que esta tela existe para acabar.
    expect(aviso.textContent).toMatch(/61,323|61\.323/);
    expect(aviso.textContent).toMatch(/61,423|61\.423/);
    expect(aviso.textContent).toContain("100");
  });

  it("anuncia por leitor de tela, porque é mudança de estado e não decoração", () => {
    montar({
      source_record_count: 100,
      canonical_record_count: 90,
      rejected_record_count: 10,
      rejected_record_reasons: [],
      acceptance_policy: "strict",
      acceptance_rule: null,
      accepted: false,
      privacy_clearance: null,
    });

    const aviso = screen.getByTestId("intake-com-recusa");
    expect(aviso).toHaveAttribute("role", "status");
    expect(aviso).toHaveAttribute("aria-live", "polite");
  });

  it("diz que está tudo aceito quando ninguém foi recusado", () => {
    // Ausência do aviso significaria duas coisas ao mesmo tempo — "não medimos" e "deu tudo
    // certo" — e quem lê não tem como distinguir.
    montar({
      source_record_count: 61423,
      canonical_record_count: 61423,
      rejected_record_count: 0,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: null,
      accepted: true,
      privacy_clearance: "passed",
    });

    expect(screen.getByTestId("intake-tudo-aceito")).toBeInTheDocument();
    expect(screen.queryByTestId("intake-com-recusa")).not.toBeInTheDocument();
  });

  it("não chama de tudo aceito quando a política bloqueou sem recusas", () => {
    montar({
      source_record_count: 25,
      canonical_record_count: 25,
      rejected_record_count: 0,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: {
        policy: "threshold",
        min_valid_ratio: 0.95,
        min_valid_records: 100,
      },
      accepted: false,
      privacy_clearance: "passed",
    });

    expect(screen.getByTestId("intake-politica-bloqueada")).toHaveTextContent(
      /policy|política/i,
    );
    expect(screen.queryByTestId("intake-tudo-aceito")).not.toBeInTheDocument();
  });

  it("não bloqueia por mínimo absoluto quando ninguém foi recusado", () => {
    montar({
      source_record_count: 25,
      canonical_record_count: 25,
      rejected_record_count: 0,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: {
        policy: "threshold",
        min_valid_ratio: 0.95,
        min_valid_records: null,
      },
      accepted: true,
      privacy_clearance: "passed",
    });

    expect(screen.getByTestId("intake-tudo-aceito")).toHaveTextContent(/25/);
    expect(screen.queryByTestId("intake-base-pequena")).not.toBeInTheDocument();
  });

  it("não renderiza nada sem medição", () => {
    const { container } = montar(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza com medição PARCIAL, porque a frase é uma comparação", () => {
    // Comparar 61.323 com ausência não produz frase: sairia "61.323 de null registros". Melhor
    // não dizer nada do que dizer uma conta pela metade.
    const { container } = montar({
      source_record_count: null,
      canonical_record_count: 61323,
      rejected_record_count: 100,
      rejected_record_reasons: [],
      acceptance_policy: null,
      acceptance_rule: null,
      accepted: null,
      privacy_clearance: null,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("distingue ZERO recusados de recusa NÃO MEDIDA", () => {
    // O par que trava a decisão: `0` afirma, `null` cala. Colapsar os dois faria a tela
    // anunciar dataset perfeito antes de ele existir.
    const zero = montar({
      source_record_count: 10,
      canonical_record_count: 10,
      rejected_record_count: 0,
      rejected_record_reasons: [],
      acceptance_policy: "strict",
      acceptance_rule: null,
      accepted: true,
      privacy_clearance: "passed",
    });
    expect(screen.getByTestId("intake-tudo-aceito")).toBeInTheDocument();
    zero.unmount();

    const naoMedido = montar({
      source_record_count: 10,
      canonical_record_count: 10,
      rejected_record_count: null,
      rejected_record_reasons: [],
      acceptance_policy: null,
      acceptance_rule: null,
      accepted: null,
      privacy_clearance: null,
    });
    expect(naoMedido.container).toBeEmptyDOMElement();
  });

  it("prioriza o Privacy Gate quando ele bloqueia o resultado, mesmo com accepted=false", () => {
    montar({
      source_record_count: 61423,
      canonical_record_count: 61323,
      rejected_record_count: 100,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: null,
      accepted: false,
      privacy_clearance: "rejected",
    });

    expect(screen.getByTestId("intake-privacy-blocked")).toBeInTheDocument();
    expect(screen.queryByTestId("intake-policy-blocked")).not.toBeInTheDocument();
  });

  it("quando threshold barra antes do motor, explica só a proporção aproveitável", () => {
    montar({
      source_record_count: 120,
      canonical_record_count: 90,
      rejected_record_count: 30,
      rejected_record_reasons: [],
      acceptance_policy: "threshold",
      acceptance_rule: {
        policy: "threshold",
        min_valid_ratio: 0.8,
        min_valid_records: 100,
      },
      accepted: false,
      privacy_clearance: "passed",
    });

    expect(screen.getByTestId("intake-policy-blocked").textContent).toContain("80%");
    expect(screen.getByTestId("intake-policy-blocked").textContent).not.toContain("100");
  });
});
