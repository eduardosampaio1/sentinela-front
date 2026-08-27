// ZERO resultado no navegador — as oito provas.
//
// Preparação local do Big Bang. Nada aqui ativa nada.
//
// A dívida que este arquivo fecha: `saveResult` gravava o `AnalysisResult` INTEIRO em
// `sessionStorage`. Sanitizar, versionar e descartar do lado do Ingestion perde o sentido se a
// resposta fica na máquina de quem consultou — nenhum purge do servidor alcança essa cópia.
//
// A jornada agora é: `analysis_id` (persistível e não sensível) vive na URL → o frontend
// pergunta ao Gateway → o resultado vive em MEMÓRIA enquanto a aba estiver aberta. Refresh
// reconsulta; não reconstrói.

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { MASSA_A, envelope } from "@/test/fixtures/canonical-result/massas";
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

// ── massa com marcadores SINTÉTICOS ───────────────────────────────────────────
// Nada aqui é dado real de cliente. São strings improváveis e únicas: se qualquer uma delas
// aparecer em qualquer storage do navegador, a busca acha — e um marcador genérico ("teste",
// "exemplo") daria falso negativo por colidir com texto legítimo da aplicação.
const MARCADORES = {
  texto: "zzq-conversa-marcador-7f3a1b",
  email: "marcador7f3a@exemplo-invalido.test",
  telefone: "+55 11 90000-7f3a",
  identificador: "cust_7f3a1b2c3d4e5f60",
} as const;

const MASSA_COM_MARCADORES = {
  ...MASSA_A,
  analysis_id: "an-storage",
  // Campos livres que um resultado real poderia carregar: recomendação em texto e metadados.
  recommendations: [
    {
      id: "rec-marcada",
      title: MARCADORES.texto,
      detail: `Contato ${MARCADORES.email} / ${MARCADORES.telefone} — cliente ${MARCADORES.identificador}`,
    },
  ],
};

function conteudoDeTodosOsStorages(): string {
  const pedacos: string[] = [];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const chave = storage.key(i);
      if (chave === null) continue;
      pedacos.push(chave, storage.getItem(chave) ?? "");
    }
  }
  return pedacos.join("\u0000");
}

function chavesDeTodosOsStorages(): string[] {
  const chaves: string[] = [];
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (let i = 0; i < storage.length; i += 1) {
      const chave = storage.key(i);
      if (chave !== null) chaves.push(chave);
    }
  }
  return chaves;
}

/**
 * Chaves que a aplicação PODE legitimamente manter — cada uma com o motivo.
 *
 * Lista de PERMISSÃO, não de proibição. Uma lista de proibição (`não pode começar com
 * sentinela:analysis:`) deixaria passar um cache novo com nome novo, que é o mesmo defeito
 * com outra etiqueta. Aqui, qualquer chave que ninguém justificou reprova.
 *
 * Nenhuma delas carrega conteúdo do cliente: são preferência de idioma, um booleano de
 * navegação e um guarda de recarga de chunk.
 */
const CHAVES_PERMITIDAS: readonly { prefixo: string; porque: string }[] = [
  { prefixo: "sentinela:language", porque: "preferência de idioma da interface" },
  { prefixo: "sentinela:history:", porque: 'booleano "este workspace já teve análise?"' },
  { prefixo: "__chunk_reload__", porque: "guarda de recarga única após deploy (main.tsx)" },
];

function chavesNaoJustificadas(): string[] {
  return chavesDeTodosOsStorages().filter(
    (k) => !CHAVES_PERMITIDAS.some((p) => k.startsWith(p.prefixo)),
  );
}

let chamadasAoResultado = 0;

function servirResultado(payload: unknown = MASSA_COM_MARCADORES) {
  chamadasAoResultado = 0;
  server.use(
    http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
      HttpResponse.json(statusView("completed", { analysis_id: "an-storage", result_available: true })),
    ),
    http.get(`${MSW_BASE}/v1/analyses/:id/result`, () => {
      chamadasAoResultado += 1;
      return HttpResponse.json({ ...envelope(payload), analysis_id: "an-storage" });
    }),
  );
}

function montar() {
  // `QueryClient` novo a cada montagem: é o que um REFRESH de verdade faz — o cache em memória
  // do React Query morre junto com a aba. Reusar o client provaria só que o cache em memória
  // funciona, que não é a pergunta.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter initialEntries={["/analyses/an-storage/result"]}>
            <Routes>
              <Route path="/analyses/:analysisId/result" element={<ResultPage />} />
            </Routes>
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("prova 1+2 — o resultado recebido não é escrito em storage nenhum", () => {
  it("nenhuma chave é criada em sessionStorage nem em localStorage", async () => {
    servirResultado();
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());

    // Asserção sobre o CONJUNTO de chaves, não sobre uma chave nomeada: um cache novo com
    // outro nome passaria por uma verificação de nome e é exatamente o mesmo defeito.
    expect(chavesNaoJustificadas()).toEqual([]);
    unmount();
  });

  it("as chaves do cache antigo não voltam a existir", async () => {
    servirResultado();
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());

    const todas = chavesDeTodosOsStorages();
    for (const prefixo of ["sentinela:analysis:", "sentinela:last_cache_key"]) {
      expect(todas.filter((k) => k.startsWith(prefixo))).toEqual([]);
    }
    unmount();
  });
});

describe("prova 6 — nenhum dado do cliente em nenhum storage", () => {
  it("texto, e-mail, telefone e identificador sintético não aparecem", async () => {
    servirResultado();
    const { unmount } = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());

    const despejo = conteudoDeTodosOsStorages();
    for (const [nome, marcador] of Object.entries(MARCADORES)) {
      expect(despejo, `${nome} vazou para o storage do navegador`).not.toContain(marcador);
    }
    unmount();
  });

  it("os marcadores CHEGARAM à aplicação — senão o teste acima não prova nada", () => {
    // Sem esta asserção, uma massa que nunca carregou os marcadores faria a busca acima passar
    // por vacuidade: procurar no storage por algo que nunca existiu em lugar nenhum.
    const serializada = JSON.stringify(MASSA_COM_MARCADORES);
    for (const marcador of Object.values(MARCADORES)) {
      expect(serializada).toContain(marcador);
    }
  });
});

describe("prova 3 — o refresh recupera o resultado pelo Gateway", () => {
  it("a segunda montagem consulta o backend de novo, com storage vazio o tempo todo", async () => {
    servirResultado();

    const primeira = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());
    expect(chamadasAoResultado).toBe(1);
    primeira.unmount();

    // Entre as duas montagens o storage continua vazio: não há de onde reconstruir.
    expect(chavesNaoJustificadas()).toEqual([]);

    const segunda = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());
    // 2, não 1: a tela voltou porque PERGUNTOU, não porque leu uma cópia local.
    expect(chamadasAoResultado).toBe(2);
    expect(chavesNaoJustificadas()).toEqual([]);
    segunda.unmount();
  });

  it("sem backend não há resultado — a tela não inventa a partir de cópia local", async () => {
    servirResultado();
    const primeira = montar();
    await waitFor(() => expect(screen.getByText("Conversations analyzed")).toBeTruthy());
    primeira.unmount();

    // O backend some. Se existisse cópia local, a tela renderizaria assim mesmo — e é
    // justamente essa renderização que não pode acontecer.
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id`, () =>
        HttpResponse.json(statusView("completed", { analysis_id: "an-storage", result_available: true })),
      ),
      http.get(`${MSW_BASE}/v1/analyses/:id/result`, () => HttpResponse.error()),
    );

    const segunda = montar();
    await waitFor(() => expect(screen.queryByText("Conversations analyzed")).toBeNull());
    expect(screen.queryByText(MARCADORES.texto)).toBeNull();
    segunda.unmount();
  });
});
