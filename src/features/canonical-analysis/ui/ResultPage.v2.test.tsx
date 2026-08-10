// A tela do documento INTEGRADO (MF6.4b) — provada contra o Gateway simulado, ponta a ponta
// dentro do navegador de teste.
//
// As massas são as mesmas do adapter: saída real do reducer do Analytics, do publicador e do
// `assemble_v2`. Aqui o que se prova não é o view model (isso é `adapterV2.test.ts`) — é o que a
// PESSOA vê: os três estados, o que aparece, o que não aparece, e o que a tela diz quando o
// contrato não serve.

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import axe from "axe-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MASSA_A, envelope } from "@/test/fixtures/canonical-result/massas";
import {
  V2_PARTIAL,
  V2_READY,
  V2_WITHHELD,
  envelopeV2,
} from "@/test/fixtures/canonical-result/massasV2";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { ResultPage } from "./ResultPage";

vi.mock("@/shell/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: { id: "ws-1" } }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});

function montar(id = "an-abc") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={[`/analyses/${id}/result`]}>
            <Routes>
              <Route path="/analyses/:analysisId/result" element={<ResultPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

/** Serve o documento v2 pelo Gateway simulado, com a versão DECLARADA no envelope. */
function servirV2(payload: unknown, opts?: { versao?: string; resultAvailable?: boolean }) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
      HttpResponse.json(
        statusView("completed", {
          analysis_id: "an-abc",
          result_available: opts?.resultAvailable ?? true,
        }),
      ),
    ),
    http.get(`${MSW_BASE}/v1/analyses/:id/result`, () =>
      HttpResponse.json({ ...envelopeV2(payload, opts?.versao), analysis_id: "an-abc" }),
    ),
  );
}

// ── ready ───────────────────────────────────────────────────────────────────

describe("v2 ready — a tela mostra a Engine E o bloco analítico", () => {
  it("as duas contagens aparecem com rótulos DIFERENTES", async () => {
    servirV2(V2_READY);
    montar();

    // A janela da Engine, no resumo de sempre.
    const janela = await screen.findByText("Records analyzed");
    expect(janela.parentElement?.textContent).toContain("100");
    // O denominador analítico, em cartão próprio e com outro nome. No v1 os dois dividiam o
    // mesmo rótulo — e é isso que a MF6.3 separou.
    const denominador = await screen.findByText("Conversations in the projection");
    expect(denominador.parentElement?.textContent).toContain("100");
  });

  it("as quatro áreas analíticas aparecem", async () => {
    servirV2(V2_READY);
    montar();

    expect(await screen.findByRole("heading", { name: "Measures" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Dimensions" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Volume concentration" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Over time" })).toBeInTheDocument();
  });

  it("Pareto: a participação sai como percentual, e as faixas com a contagem escrita", async () => {
    servirV2(V2_READY);
    montar();

    const pergunta = await screen.findByText("Volume held by the top 20%");
    expect(pergunta.parentElement?.textContent).toContain("62.3%");
    // A barra da faixa NÃO substitui o número: quem não distingue barras continua lendo 68.
    const faixas = await screen.findByText("Entities by value");
    const cartao = faixas.closest("li");
    expect(cartao?.textContent).toContain("68");
  });

  it("temporal: as seis janelas aparecem rotuladas pela granularidade da série", async () => {
    servirV2(V2_READY);
    montar();

    const serie = await screen.findByRole("heading", { name: "Over time" });
    const secao = serie.closest("section");
    expect(secao?.textContent).toContain("Jul 2026");
    expect(secao?.textContent).toContain("Dec 2026");
    expect(secao?.textContent).toContain("month");
  });

  it("declara os blocos que recebeu e não apresenta — nada some em silêncio", async () => {
    servirV2(V2_READY);
    montar();

    const notas = await screen.findByRole("heading", { name: "About this view" });
    expect(notas.closest("section")?.textContent).toContain(
      "carries 1 analytics block(s) that this page does not display",
    );
  });

  it("não inventa percentual: as contagens dos grupos são contagens", async () => {
    servirV2(V2_READY);
    montar();

    const dimensoes = await screen.findByRole("heading", { name: "Dimensions" });
    const secao = dimensoes.closest("section");
    expect(secao?.textContent).toContain("whatsapp");
    expect(secao?.textContent).toContain("45");
    // `45 / 100` daria "45%" — e seria um número que o backend não publicou.
    expect(secao?.textContent).not.toContain("45%");
  });

  it("axe: sem violações na página do documento integrado", async () => {
    servirV2(V2_READY);
    const { container } = montar();
    await screen.findByRole("heading", { name: "Volume concentration" });

    const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});

// ── partial ─────────────────────────────────────────────────────────────────

describe("v2 partial — a tela diz que entregou menos, sem fingir erro", () => {
  it("mostra o aviso de omissão E o conteúdo que sobrou", async () => {
    servirV2(V2_PARTIAL);
    montar();

    const aviso = await screen.findByText(/omitted to avoid revealing small groups/);
    // `role="status"`, não `alert`: informa o desfecho, não interrompe.
    expect(aviso.getAttribute("role")).toBe("status");
    // O conteúdo continua lá — `partial` não é `withheld`.
    expect(await screen.findByRole("heading", { name: "Measures" })).toBeInTheDocument();
  });
});

// ── withheld ────────────────────────────────────────────────────────────────

describe("v2 withheld — conclusão de privacidade, não falha", () => {
  it("mostra o estado próprio, sem vermelho, sem retry e sem alert", async () => {
    servirV2(V2_WITHHELD);
    montar();

    const titulo = await screen.findByText("Analytics results were not released");
    const bloco = titulo.closest("div");
    expect(bloco?.getAttribute("role")).toBe("status");
    // Nada de "tentar de novo": não há o que tentar, e oferecer mandaria insistir contra uma
    // decisão de privacidade.
    expect(within(bloco as HTMLElement).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a Engine continua inteira — só o componente analítico foi retido", async () => {
    servirV2(V2_WITHHELD);
    montar();

    const janela = await screen.findByText("Records analyzed");
    expect(janela.parentElement?.textContent).toContain("100");
    expect(await screen.findByRole("heading", { name: "Indicators" })).toBeInTheDocument();
    // E nenhuma área analítica aparece: não há conteúdo para elas.
    expect(screen.queryByRole("heading", { name: "Measures" })).toBeNull();
  });
});

// ── as recusas na tela ──────────────────────────────────────────────────────

describe("contrato que não serve vira estado seguro — nunca uma tela parcial", () => {
  it("v2 inválido NÃO cai para o v1 mostrando um resultado que parece completo", async () => {
    // Este é o desfecho mais caro possível: o v1 aceitaria a espinha comum (indicadores,
    // recomendações), o bloco analítico sumiria, e a tela pareceria correta.
    servirV2({ ...V2_READY, analytics: { ...V2_READY.analytics, data: null } });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain("format this page doesn't support yet");
    expect(screen.queryByRole("heading", { name: "Indicators" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Measures" })).toBeNull();
  });

  it("versão desconhecida vira estado seguro, sem JSON cru na tela", async () => {
    servirV2(V2_READY, { versao: "analysis-result-v9" });
    montar();

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).not.toContain("snapshot");
    expect(alerta.textContent).not.toContain("{");
  });

  it("o v1 histórico continua renderizando como sempre", async () => {
    // Cadeado da compatibilidade: a fatia acrescenta o v2 e não pode custar o v1.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(statusView("completed", { analysis_id: "an-abc", result_available: true })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/:id/result`, () =>
        HttpResponse.json({ ...envelope(MASSA_A), analysis_id: "an-abc" }),
      ),
    );
    montar();

    const janela = await screen.findByText("Records analyzed");
    expect(janela.parentElement?.textContent).toContain("100");
    expect(await screen.findByRole("heading", { name: "Indicators" })).toBeInTheDocument();
    // E NENHUM bloco analítico: o v1 não tem um, e inventá-lo vazio afirmaria uma ausência.
    expect(screen.queryByRole("heading", { name: "Analytics" })).toBeNull();
  });
});

// ── a barreira, vista da tela ───────────────────────────────────────────────

describe("Analytics pronto antes da Engine não vira meia-tela", () => {
  it("sem resultado disponível, a página espera — não monta um painel vazio", async () => {
    // A composição só nasce quando os DOIS lados terminaram (a barreira do Orchestrator). Até
    // lá o Gateway não tem documento, e a tela precisa dizer isso em vez de desenhar as seções
    // analíticas com o que já existiria do lado do Analytics.
    servirV2(V2_READY, { resultAvailable: false });
    montar();

    const espera = await screen.findByRole("status");
    expect(espera.textContent).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Measures" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Indicators" })).toBeNull();
  });
});

// ── export ──────────────────────────────────────────────────────────────────
//
// AQUI FICAVA "baixa um CSV com os números exibidos, e sem o digest".
//
// Ele provava, com rigor, um comportamento que a **M29 removeu por autoridade**: o CSV montado no
// navegador a partir do view model. A D16 é literal — *"uma única noção de exportação: o artefato
// do backend; o CSV local SAI"*. O teste não estava errado; o produto é que deixou de fazer aquilo.
//
// O que substituiu está em `src/test/v1/res01-m29.test.tsx`: a ação de export passa pelo cliente
// canônico da M22, e só existe quando o eixo `export` de `/progress` diz `ready`.
