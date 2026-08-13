// F2 — as regras do shell da Analysis, provadas.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { AnalysisShell } from "./AnalysisShell";
import { VISOES_DA_ANALISE } from "./visoes";

const RAIZ = resolve(__dirname, "../../../..");

// O provider nasce em EN quando ninguem declarou (`LanguageContext`). Estas provas comparam com
// `pt.json`, entao a lingua e DECLARADA — sem isto, o teste compararia PT com EN e falharia por
// motivo que nada tem a ver com a regra sob prova.
function renderAt(
  rota: string,
  props: Partial<Parameters<typeof AnalysisShell>[0]> = {},
) {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[rota]}>
        <AnalysisShell analysisId="an-abc" titulo="Título" {...props} />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("F2 · shell da Analysis — identidade e estado", () => {
  it("mostra a identidade da Analysis, legível", () => {
    // É ela que a pessoa cola num chamado, e é ela que torna a Analysis retomável por deep link.
    renderAt("/analyses/an-abc/argos");
    expect(screen.getByText("an-abc")).toBeInTheDocument();
  });

  it("a identidade tem rótulo acessível — não é um código solto na tela", () => {
    renderAt("/analyses/an-abc/argos");
    expect(screen.getByText(pt.canonicalAnalysis.shell.identity)).toBeInTheDocument();
  });

  it("o badge fala o vocabulário da ANALYSIS, não o de eixo", () => {
    // `completed` é estado público. Se o shell passasse a falar o vocabulário de eixo, ele
    // estaria dizendo "status do motor" — e são coisas diferentes, com conjuntos que se
    // sobrepõem em alguns nomes e divergem em outros.
    renderAt("/analyses/an-abc/argos", { estado: "completed" });
    expect(screen.getByText(pt.estadoPublico.completed)).toBeInTheDocument();
  });

  it("SEM estado não há badge — ausência não vira um nono estado público", () => {
    renderAt("/analyses/an-abc/argos");
    expect(screen.queryByText(pt.estadoPublico.completed)).not.toBeInTheDocument();
    expect(screen.queryByText(pt.estadoPublico.running)).not.toBeInTheDocument();
  });
});

describe("F2 · shell da Analysis — navegação entre visões", () => {
  it("sem visões registradas, não há navegação", () => {
    // A lista é dado e cresce quando a visão passa a EXISTIR. Um item para rota não registrada
    // mandaria a pessoa ao 404 — pior que ausência, porque parece funcionar.
    renderAt("/analyses/an-abc");
    if (VISOES_DA_ANALISE.length === 0) {
      expect(
        screen.queryByRole("navigation", { name: pt.canonicalAnalysis.shell.viewsNavLabel }),
      ).not.toBeInTheDocument();
    }
  });

  it("cada visão registrada vira um link para a subrota dela", () => {
    renderAt("/analyses/an-abc");
    for (const visao of VISOES_DA_ANALISE) {
      const rotulos = pt.canonicalAnalysis.shell.view as Record<string, string>;
      const link = screen.getByRole("link", { name: rotulos[visao.caminho] });
      expect(link).toHaveAttribute("href", `/analyses/an-abc/${visao.caminho}`);
    }
  });

  it("a visão ATUAL é anunciada por `aria-current`, não só por cor", () => {
    if (VISOES_DA_ANALISE.length === 0) return;
    const alvo = VISOES_DA_ANALISE[0];
    renderAt(`/analyses/an-abc/${alvo.caminho}`);
    const links = screen.getAllByRole("link");
    const atual = links.filter((l) => l.getAttribute("aria-current") === "page");
    expect(atual).toHaveLength(1);
    expect(atual[0]).toHaveAttribute("href", `/analyses/an-abc/${alvo.caminho}`);
  });

  it("a identidade viaja codificada no href", () => {
    window.localStorage.setItem("sentinela:language", "pt");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/analyses/a%2Fb"]}>
          <AnalysisShell analysisId="a/b" titulo="T" />
        </MemoryRouter>
      </LanguageProvider>,
    );
    for (const link of screen.queryAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("/a/b/");
    }
  });
});

describe("F2 · o padrão estrutural é subrota, nunca aba", () => {
  it("o shell não usa `Tabs` nem `role=\"tab\"`", () => {
    // O produto não possui o pattern: não existe no Design System, não há uso em lugar nenhum e
    // nenhuma autoridade o menciona. Inventá-lo aqui seria um primitivo estrutural novo — e a
    // aba perderia deep link, refresh e histórico, que a subrota dá de graça.
    const fonte = readFileSync(
      resolve(RAIZ, "src/features/canonical-analysis/ui/AnalysisShell.tsx"),
      "utf-8",
    );
    expect(fonte).not.toMatch(/role=["']tab/);
    expect(fonte).not.toMatch(/\bTabsList\b|\bTabsTrigger\b|<Tabs\b/);
  });

  it("a navegação é `nav` + lista de links — semântica de navegação, não de widget", () => {
    if (VISOES_DA_ANALISE.length === 0) return;
    renderAt("/analyses/an-abc");
    const nav = screen.getByRole("navigation", {
      name: pt.canonicalAnalysis.shell.viewsNavLabel,
    });
    expect(nav.querySelectorAll("a").length).toBe(VISOES_DA_ANALISE.length);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
