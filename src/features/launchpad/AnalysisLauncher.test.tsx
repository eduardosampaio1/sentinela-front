import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisLauncher } from "./AnalysisLauncher";

/**
 * Caracterização do Launchpad: a entrada de análise deixa de executar inline.
 *
 * O caminho antigo era `handleFileUpload` / `handlePasteAnalysis` → `runAnalysis` → `/api/analyze`,
 * que o Gateway recusa sem `project_id` + `environment_id`. Esse eixo perde dono quando a
 * identidade vira workspace-only, e dar a ele uma fonte própria seria persistência paralela.
 *
 * A jornada canônica não aceita prefill: `StartAnalysisPage` é um botão que faz `prepare` e navega
 * para a identidade durável; o `UploadStep` recebe o `File` só depois. Por isso o launcher leva
 * apenas o MODO pretendido — em `state` do router, nunca na URL.
 *
 * ## O que estes testes têm de dentes
 *
 * `fetch` é substituído por um espião que EXPLODE. Qualquer resquício do caminho inline — uma
 * chamada a `/api/analyze`, um upload antecipado, uma gravação — falha o caso, mesmo que a
 * navegação continue correta. E o componente é montado SEM `AnalysisProvider`: enquanto ele
 * consumisse `useAnalysis`, o render lançaria.
 */

function Espelho() {
  const loc = useLocation();
  return (
    <div>
      <p>entrada canônica</p>
      <p data-testid="modo">{String((loc.state as { modo?: string } | null)?.modo ?? "sem-modo")}</p>
      <p data-testid="url">{loc.pathname + loc.search + loc.hash}</p>
    </div>
  );
}

function montar() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route path="/home" element={<AnalysisLauncher />} />
        <Route path="/canonical/analyses/new" element={<Espelho />} />
      </Routes>
    </MemoryRouter>,
  );
}

const CONTEUDO = '{"conversation_id":"c1","messages":[]}\n{"conversation_id":"c2","messages":[]}';

let chamadas: string[] = [];
let fetchOriginal: typeof globalThis.fetch;

beforeEach(() => {
  chamadas = [];
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (entrada: RequestInfo | URL) => {
    chamadas.push(String(entrada));
    throw new Error(`rede proibida neste fluxo: ${String(entrada)}`);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe("AnalysisLauncher — entrada leva à jornada canônica", () => {
  it("monta SEM AnalysisProvider", () => {
    // Cadeado de desacoplamento: enquanto consumisse `useAnalysis`, este render lançaria.
    expect(() => montar()).not.toThrow();
  });

  it("escolher arquivo navega para a entrada canônica", async () => {
    const { container } = montar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input, "o seletor de arquivo existe").toBeTruthy();

    await userEvent.upload(input, new File([CONTEUDO], "dataset.jsonl", { type: "application/json" }));

    expect(await screen.findByText("entrada canônica")).toBeInTheDocument();
    expect(screen.getByTestId("modo")).toHaveTextContent("file");
  });

  it("colar texto navega para a entrada canônica", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Paste JSON" }));
    // `type` interpreta `{` como descritor de tecla do userEvent; `paste` entrega o texto cru.
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste('{"a":1}');
    await userEvent.click(screen.getByRole("button", { name: "Analyze dataset" }));

    expect(await screen.findByText("entrada canônica")).toBeInTheDocument();
    expect(screen.getByTestId("modo")).toHaveTextContent("paste");
  });

  it("nenhuma requisição sai da ação — nem /api/analyze, nem upload antecipado", async () => {
    const { container } = montar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File([CONTEUDO], "dataset.jsonl"));
    await screen.findByText("entrada canônica");

    expect(chamadas, "o launcher não fala com a rede").toEqual([]);
  });

  it("nenhum conteúdo do dataset aparece na URL", async () => {
    const { container } = montar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File([CONTEUDO], "dataset.jsonl"));
    await screen.findByText("entrada canônica");

    const url = screen.getByTestId("url").textContent ?? "";
    expect(url).toBe("/canonical/analyses/new");
    expect(url).not.toContain("conversation_id");
    expect(url).not.toContain("dataset.jsonl");
  });

  it("não exige project nem environment para agir", async () => {
    // O componente é montado sem NENHUM contexto de identidade. Se voltasse a depender de
    // `project`/`environment`, ou lançaria, ou bloquearia a ação — os dois falham este caso.
    const { container } = montar();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File([CONTEUDO], "dataset.jsonl"));
    expect(await screen.findByText("entrada canônica")).toBeInTheDocument();
  });

  it("não toca a camada de dados Supabase", async () => {
    // Prova por substituição: os módulos de dados explodem se alguém os chamar. Cobre o caso em
    // que a navegação foi migrada mas uma gravação "de histórico" sobreviveu ao lado.
    const modulos = ["@/lib/analysisRuns", "@/lib/analysisJobs"];
    for (const m of modulos) {
      vi.doMock(m, () => new Proxy({}, { get: () => () => { throw new Error(`${m} nao pode ser chamado`); } }));
    }
    try {
      const { container } = montar();
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, new File([CONTEUDO], "dataset.jsonl"));
      expect(await screen.findByText("entrada canônica")).toBeInTheDocument();
    } finally {
      vi.doUnmock("@/lib/analysisRuns");
      vi.doUnmock("@/lib/analysisJobs");
    }
  });
});
