import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { lerEixos } from "../result/eixos";
import { EtapasDaAnalise } from "./EtapasDaAnalise";

describe("etapas públicas da análise", () => {
  it("mostra o percentual medido pelo backend durante a proteção", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(
      <LanguageProvider>
        <EtapasDaAnalise
          view={statusView("receiving")}
          eixos={lerEixos({ analysis_id: "an-abc", axes: [] })}
          intakeProgress={{
            stage: "protecting",
            processed_bytes: 750_000_000,
            total_bytes: 1_000_000_000,
            percent: 75,
            conversations_seen: 300,
            conversations_ready: 294,
            conversations_outside_analysis: 6,
            last_activity_at: "2026-08-28T01:00:00+00:00",
          }}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("progressbar", { name: "Progresso da proteção da base" }))
      .toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText(/750 MB de 1 GB revisados/)).toBeInTheDocument();
    expect(screen.getByText(/300 conversas encontradas/)).toBeInTheDocument();
  });

  it("não faz a proteção voltar a Waiting depois que a análise já está rodando", () => {
    window.localStorage.setItem("sentinela:language", "en");
    render(
      <LanguageProvider>
        <EtapasDaAnalise
          view={statusView("running", { intake: null })}
          eixos={lerEixos({
            analysis_id: "an-abc",
            axes: [
              { axis: "engine", state: "running" },
              { axis: "analytics", state: "ready" },
              { axis: "export", state: "ready" },
              { axis: "final_result", state: "pending" },
            ],
          })}
        />
      </LanguageProvider>,
    );

    const protecao = screen.getByText("Data protection").closest("li");
    expect(protecao).toHaveTextContent("Done");
    expect(protecao).not.toHaveTextContent("Waiting");
    expect(screen.getByRole("progressbar", { name: "Analysis stage progress" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/Step 4 of 4.*Final result/),
    );
  });

  it("renderiza a verdade operacional do servidor sem reconstituir a etapa no Front", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(
      <LanguageProvider>
        <EtapasDaAnalise
          view={statusView("running")}
          eixos={lerEixos({ analysis_id: "an-abc", axes: [] })}
          operationalTruth={{
            contract_version: "analysis-operational-truth-v1",
            current_stage: "privacy",
            current_state: "attention",
            owner: "user",
            next_action: "provide_mapping",
            last_progress_at: null,
            stages: [
              { stage: "upload", state: "done" },
              { stage: "privacy", state: "attention" },
              { stage: "measures", state: "waiting" },
              { stage: "final_result", state: "waiting" },
            ],
          }}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText("Proteção dos dados").closest("li")).toHaveTextContent(
      "Ação necessária",
    );
    expect(screen.getByTestId("operational-next-action")).toHaveTextContent(
      "Sua ação: revise as colunas",
    );
  });
});
