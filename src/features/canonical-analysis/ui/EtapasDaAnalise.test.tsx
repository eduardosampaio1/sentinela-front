import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { lerEixos } from "../result/eixos";
import { EtapasDaAnalise } from "./EtapasDaAnalise";

describe("etapas públicas da análise", () => {
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
});
