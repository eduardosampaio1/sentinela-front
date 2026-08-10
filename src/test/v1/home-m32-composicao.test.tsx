// M32 · HOME-01 — a composição da superfície.
//
// A semântica já está provada em `home-m32-regioes`. Aqui o que se guarda é o que a TELA faz com
// ela: os três estados distintos, a hierarquia entre as regiões, o que a Home se proíbe de mostrar
// e o que sobrou do `/home` legado (nada).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import en from "@/i18n/en.json";
import { PUBLIC_STATES, type AnalysisListItem } from "@/lib/v1";
import {
  RegiaoDeAcoes,
  RegiaoDeInstancias,
  RegiaoDeResultados,
  RegiaoEmAndamento,
} from "@/features/home/RegioesDaHome";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const item = (over: Partial<AnalysisListItem> = {}): AnalysisListItem => ({
  analysis_id: "an-1",
  status: "completed",
  record_count: 100,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
  ...over,
});

const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. O vocabulário público de estados tem casa própria, e está completo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 1. um só vocabulário de estados", () => {
  it("os OITO estados públicos têm rótulo nos dois idiomas", () => {
    // Critério 17: uma única semântica pública de estados. Um estado sem rótulo viraria chave
    // crua na tela — e um estado novo no contrato reprova aqui antes de chegar ao navegador.
    for (const estado of PUBLIC_STATES) {
      expect((pt as unknown as Record<string, Record<string, string>>).estadoPublico[estado], `pt sem ${estado}`).toBeTruthy();
      expect((en as unknown as Record<string, Record<string, string>>).estadoPublico[estado], `en sem ${estado}`).toBeTruthy();
    }
  });

  it("os rótulos congelados do §15 são respeitados", () => {
    const p = (pt as unknown as Record<string, Record<string, string>>).estadoPublico;
    expect(p.recovering).toBe("Retomando");
    expect(p.needs_mapping).toBe("Ação necessária");
    // `failed` nunca é "erro temporário"; `recovering` nunca é "falhou".
    expect(p.failed.toLowerCase()).not.toContain("temporár");
    expect(p.recovering.toLowerCase()).not.toContain("falh");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. A fila, e o que ela NÃO oferece
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 2. Ações necessárias", () => {
  it("`needs_mapping` aparece com o motivo do bloqueio e SEM operação", () => {
    montar(<RegiaoDeAcoes itens={[item({ analysis_id: "an-nm", status: "needs_mapping" })]} />);
    expect(screen.getByText(pt.home.actions.needsMappingBlocked)).toBeTruthy();
    // Nenhum "Confirmar" funcional, nenhum deep link para fluxo inexistente.
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("`failed` NÃO oferece `Tentar novamente` — a listagem não publica `retry_allowed`", () => {
    montar(<RegiaoDeAcoes itens={[item({ analysis_id: "an-f", status: "failed", result_available: false })]} />);
    expect(screen.queryByText(pt.canonicalAnalysis.action.retry)).toBeNull();
    // O que existe é abrir a análise, onde o estado individual vive.
    const link = screen.getByRole("link", { name: pt.home.openAnalysis });
    expect(link.getAttribute("href")).toBe("/analyses/an-f");
  });

  it("fila vazia PERMANECE como região, dizendo que está vazia", () => {
    montar(<RegiaoDeAcoes itens={[]} />);
    expect(screen.getByRole("heading", { name: pt.home.actions.title })).toBeTruthy();
    expect(screen.getByText(pt.home.actions.none)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. As outras regiões
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 3. andamento, resultados e Instâncias", () => {
  it("ausência de `record_count` vira a palavra do produto, nunca `0`", () => {
    const { container } = montar(
      <RegiaoEmAndamento itens={[item({ status: "running", result_available: false, record_count: null })]} />,
    );
    expect(screen.getByText(pt.home.recordCountAbsent)).toBeTruthy();
    expect(within(container).queryByText("0")).toBeNull();
  });

  it("`completed` sem documento aparece SEM link para o resultado", () => {
    montar(
      <RegiaoDeResultados
        itens={[item({ analysis_id: "ok" })]}
        semResultado={[item({ analysis_id: "vazio", result_available: false })]}
      />,
    );
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/analyses/ok/result",
    ]);
    expect(screen.getByText(pt.home.resultUnavailable)).toBeTruthy();
  });

  it("Instâncias é nomeada e declarada indisponível, sem placeholder nem CTA", () => {
    montar(<RegiaoDeInstancias />);
    expect(screen.getByRole("heading", { name: pt.home.instances.title })).toBeTruthy();
    expect(screen.getByText(pt.home.instances.unavailable)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A Home não é dashboard de KPIs
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 4. o que a Home se proíbe", () => {
  const FONTES = () =>
    ["src/features/home/HomePage.tsx", "src/features/home/RegioesDaHome.tsx"]
      .map((f) => semComentarios(ler(f)))
      .join("\n");

  it("nenhum contador, score, saúde, percentual, sparkline ou ranking", () => {
    // D9: "não é dashboard de KPIs". DoD: "o que precisa de mim", não "quantos temos".
    for (const proibido of [
      "score", "health", "risk", "sparkline", "ranking", "percent", "%",
      ".length}", "Math.", "reduce(",
    ]) {
      expect(FONTES(), `a Home passou a exibir: ${proibido}`).not.toContain(proibido);
    }
  });

  it("não chama `/progress` — barra agregada seria percentual inventado", () => {
    expect(FONTES()).not.toContain("useAnalysisProgress");
    expect(FONTES()).not.toContain("progress");
  });

  it("controle positivo: a varredura enxerga um termo quando ele existe", () => {
    expect(FONTES()).toContain("RegiaoDeAcoes");
    expect(FONTES().length).toBeGreaterThan(3000);
  });

  it("zero cor literal na superfície nova", () => {
    // Critério 15. O `/home` legado tinha 34 delas declaradas como dívida; a nova nasce em zero.
    expect(FONTES()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(FONTES()).not.toContain("rgba(");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O legado não sobreviveu
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 5. o `/home` legado saiu inteiro", () => {
  it("`features/launchpad` não existe mais", () => {
    expect(existsSync(resolve(RAIZ, "src/features/launchpad"))).toBe(false);
  });

  it("`/home` serve a HomePage canônica", () => {
    const r = semComentarios(ler("src/app/router.tsx"));
    expect(r).toContain("<HomePage />");
    expect(r).not.toContain("LaunchpadPage");
  });

  it("o vocabulário fabricado não migrou para lugar nenhum", () => {
    // `behavior_score` não existe em nenhum `.py` de `sentinela-facts`; a Landing o mostra com
    // números de vitrine, e Landing não é autoridade de resultado.
    // Comentários EXPLICAM a remoção e citam os termos; medir prosa foi o defeito das M25/M28.
    const f = FONTES_HOME();
    for (const inventado of ["behavior", "Behavior", "economic", "Economic", "classification"]) {
      expect(f, `vocabulário fabricado ressuscitou: ${inventado}`).not.toContain(inventado);
    }
  });

  const FONTES_HOME = () =>
    [
      "src/features/home/HomePage.tsx",
      "src/features/home/RegioesDaHome.tsx",
      "src/features/home/regioes.ts",
    ]
      .map((f) => semComentarios(ler(f)))
      .join("\n");
});
