import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import axe from "axe-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import {
  MASSA_A,
  MASSA_B,
  MASSA_D_PARCIAL,
  PAYLOAD_SCHEMA_DESCONHECIDO,
  envelope,
} from "@/test/fixtures/canonical-result/massas";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { INDICATOR_DESCRIPTORS } from "../result/descriptors";
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

function servir(payload: unknown, opts?: { resultAvailable?: boolean }) {
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
      HttpResponse.json(statusView("completed", { analysis_id: "an-abc", result_available: opts?.resultAvailable ?? true })),
    ),
    // O envelope DECLARA a versão do que entrega (discriminador contratado). O `envelope`
    // deriva da própria massa, como um backend faria — o front nunca infere a partir do blob.
    http.get(`${MSW_BASE}/v1/analyses/:id/result`, () =>
      HttpResponse.json({ ...envelope(payload), analysis_id: "an-abc" }),
    ),
  );
}

describe("ResultPage — renderização canônica dos indicadores (massa A)", () => {
  it("mostra resumo, indicadores com rótulo/valor/unidade e recomendações na ordem recebida", async () => {
    servir(MASSA_A);
    montar();

    // resumo do backend
    const rotuloRegistros = await screen.findByText("Records analyzed");
    expect(rotuloRegistros.parentElement?.textContent).toContain("100");

    // `Useful outcomes` NAO esta mais no resumo: no contrato canonico ele e um INDICADOR, com
    // estado e denominador proprios. Duplica-lo criaria dois lugares para o mesmo numero.
    const uteis = screen.getByText("Useful outcomes").closest("li");
    expect(uteis, "useful outcomes deve ser um indicador (li), nao um item do resumo").toBeTruthy();
    expect(uteis?.textContent).toContain("80");

    // indicadores: rótulo do descriptor + valor formatado + unidade
    expect(screen.getByText("Useful outcome rate")).toBeTruthy();
    expect(screen.getByText("Intent coverage")).toBeTruthy();
    // Escopado ao cartao: com 14 indicadores, "85" tambem e a cobertura do campo de desfecho.
    const cobertura = screen.getByText("Intent coverage").closest("li");
    expect(cobertura?.textContent).toContain("85");
    expect(cobertura?.textContent).toContain("%");

    // contagem NUNCA vira percentual
    const conversas = screen.getByText("Analyzed conversations").closest("li");
    expect(conversas?.textContent).toContain("100");
    expect(conversas?.textContent).not.toContain("100%");

    // recomendações na ordem recebida
    const recs = screen.getAllByText(/Revisar intencoes|Investigar respostas/);
    expect(recs[0].textContent).toMatch(/Revisar intencoes/);

    // procedencia visivel: contrato + registro de indicadores
    expect(screen.getByText(/analysis-result-v1/)).toBeTruthy();
    expect(screen.getByText(/indicator-registry-1\.0/)).toBeTruthy();
  });
});

describe("ResultPage — ausência, parcialidade e incompatibilidade", () => {
  it("massa B: 'Não aplicável' para CPUO e 0% para cobertura (zero real)", async () => {
    servir(MASSA_B);
    montar();
    // Sem desfecho util nao ha denominador: AUSENTE, e o texto e distinto de "0".
    const cpuo = (await screen.findByText("Cost per useful outcome")).closest("li");
    expect(cpuo?.textContent).toContain("Not measured");
    expect(cpuo?.textContent).not.toMatch(/\b0\b/);

    // Zero REAL continua sendo zero — e essa e a diferenca que importa.
    const taxa = screen.getByText("Useful outcome rate").closest("li");
    expect(taxa?.textContent).toContain("0");
    expect(taxa?.textContent).toContain("%");

    // Parcialidade DECLARADA pela origem (a massa B saiu incompleta do Assembler).
    expect(screen.getByText(/Some sections aren't available/i)).toBeTruthy();
  });

  it("massa B: sem recomendações → a seção NÃO é renderizada", async () => {
    servir(MASSA_B);
    montar();
    await screen.findByText("Cost per useful outcome");
    expect(screen.queryByText("Recommendations")).toBeNull();
  });

  it("massa parcial: indicador suportado aparece + aviso de parcialidade", async () => {
    servir(MASSA_D_PARCIAL);
    montar();
    expect(await screen.findByText("Useful outcome rate")).toBeTruthy();
    expect(screen.getByText(/Some sections aren't available/i)).toBeTruthy();
  });

  it("schema desconhecido: estado seguro, sem JSON cru e sem indicadores", async () => {
    servir(PAYLOAD_SCHEMA_DESCONHECIDO);
    montar();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/doesn't support yet/i)).toBeTruthy();
    expect(screen.queryByText("Indicators")).toBeNull();
    expect(screen.queryByText(/outro-schema-v9/)).toBeNull(); // nada de payload cru na tela
  });

  it("completed sem resultado disponível: estado 'em preparação', sem dashboard vazio", async () => {
    servir(MASSA_A, { resultAvailable: false });
    montar();
    expect(await screen.findByText(/still being prepared/i)).toBeTruthy();
    expect(screen.queryByText("Indicators")).toBeNull();
  });
});

describe("ResultPage — integridade indicador ↔ descriptor ↔ campo canônico", () => {
  it("todo indicador renderizado tem descriptor com label, description e sourceField", async () => {
    servir(MASSA_A);
    montar();
    await screen.findByText("Useful outcome rate");
    for (const id of MASSA_A.indicators.map((i: { id: string }) => i.id)) {
      const d = INDICATOR_DESCRIPTORS[id];
      expect(d, `sem descriptor: ${id}`).toBeTruthy();
      expect(d.labelKey).toContain(id);
      expect(d.descriptionKey).toContain(id);
      expect(d.sourceField.length).toBeGreaterThan(0); // rastreável ao campo do backend
    }
  });

  it("axe: sem violações na página de resultado", async () => {
    servir(MASSA_A);
    const { container } = montar();
    await screen.findByText("Useful outcome rate");
    const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(r.violations).toEqual([]);
  });
});
