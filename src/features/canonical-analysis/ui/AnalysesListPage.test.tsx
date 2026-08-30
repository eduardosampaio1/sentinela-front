import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import axe from "axe-core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createV1Client, type V1Client, type AnalysisStatus } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { CanonicalClientProvider } from "../data/client";
import { AnalysesListPage } from "./AnalysesListPage";

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
const auth = vi.hoisted(() => ({
  ws: { id: "ws-1" } as { id: string } | null,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ workspace: auth.ws }) }));

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({
    baseUrl: MSW_BASE,
    getAccessToken: async () => "tok",
  });
});
beforeEach(() => {
  auth.ws = { id: "ws-1" };
});

function renderList() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={client}>
          <MemoryRouter>
            <AnalysesListPage />
          </MemoryRouter>
        </CanonicalClientProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  );
}

const item = (
  id: string,
  status: AnalysisStatus = "completed",
  result = true,
) => ({
  analysis_id: id,
  status,
  record_count: 5,
  result_available: result,
  created_at: "2020-01-02T00:00:00Z",
});
const page = (
  items: ReturnType<typeof item>[],
  next: string | null = null,
) => ({ items, next_cursor: next });
const problem = (code: string, status: number) =>
  HttpResponse.json(
    {
      type: `urn:sentinela:error:${code}`,
      title: code,
      status,
      code,
      detail: code,
    },
    {
      status,
      headers: { "content-type": "application/problem+json" },
    },
  );

describe("AnalysesListPage — estados distintos", () => {
  it("dados: lista os itens contratados com o estado público", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(page([item("an-1"), item("an-2", "running", false)])),
      ),
    );
    renderList();
    expect(await screen.findByText("an-1")).toBeTruthy();
    expect(screen.getByText("an-2")).toBeTruthy();
    // estado como TEXTO (não só cor)
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
    // link acessível por analysis_id
    expect(
      screen.getByRole("link", { name: /Open analysis an-1/i }),
    ).toBeTruthy();
  });

  it("prioriza nome publicado e rebaixa o UUID para referência curta", async () => {
    const id = "0774667c-017b-4886-a429-cfb8e842f6a6";
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(
          page([
            {
              ...item(id),
              display_name: "Piloto cartão — agosto",
              instance_id: null,
            } as never,
          ]),
        ),
      ),
    );
    renderList();

    expect(await screen.findByText("Piloto cartão — agosto")).toBeVisible();
    expect(screen.getByText(/Latest/)).toBeVisible();
    expect(screen.getByText(/0774667c…f6a6/)).toBeVisible();
    expect(screen.queryByText(id)).toBeNull();
  });

  // M45.4 — comparar só é OFERECIDO quando comparar é possível.
  //
  // Com UMA análise, o botão abria um modo que nunca terminava: marcava-se a única caixa e o
  // "Comparar as duas" ficava desabilitado para sempre, com a regra explicada só DEPOIS do
  // convite. Prevenção de erro é não oferecer.
  //
  // Os DOIS lados são medidos no mesmo bloco, e isso não é zelo: um teste que só exigisse a
  // ausência passaria com o botão apagado da lista inteira, e a correção teria removido a
  // funcionalidade em vez de protegê-la. É a massa vazia que sempre passa.
  describe("M45.4 · comparar não é oferecido quando é impossível", () => {
    it("uma única análise: sem convite para comparar", async () => {
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, () =>
          HttpResponse.json(page([item("an-só")])),
        ),
      );
      renderList();
      expect(await screen.findByText("an-só")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Compare$/ })).toBeNull();
    });

    it("duas análises: o convite existe, e leva ao modo de seleção", async () => {
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, () =>
          HttpResponse.json(page([item("an-1"), item("an-2")])),
        ),
      );
      renderList();
      const convite = await screen.findByRole("button", { name: /^Compare$/ });
      await userEvent.click(convite);
      // A dica de seleção é o estado, e as caixas são o meio: sem elas o convite era decorativo.
      expect(
        await screen.findByText(/Pick exactly two analyses/i),
      ).toBeTruthy();
      expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    });

    it("uma análise NESTA página, mas há outra página: o convite fica", async () => {
      // A seleção sobrevive à paginação, então uma última página curta não prova ausência de par.
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, () =>
          HttpResponse.json(page([item("an-1")], "cur-2")),
        ),
      );
      renderList();
      expect(await screen.findByText("an-1")).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Compare$/ })).toBeTruthy();
    });
  });

  // Decisão de owner (2026-08-15): filtro por Instance no lugar da busca por texto.
  //
  // O contrato não tem parâmetro de busca — `GET /v1/analyses` aceita `workspace_id`, `cursor`,
  // `limit`, `instance_id`, `project_id`, `environment_id` e `baseline_eligible`. Um campo de texto
  // só filtraria a PÁGINA carregada e diria "nada encontrado" para uma análise que está na página
  // 3. `instance_id` filtra no SERVIDOR, sobre tudo.
  describe("M45.2 · filtro por Instância", () => {
    const comInstancias = () =>
      server.use(
        http.get(`${MSW_BASE}/v1/instances`, () =>
          HttpResponse.json({
            items: [{ instance_id: "i-1", name: "Suporte", created_at: null }],
            next_cursor: null,
          }),
        ),
      );

    it("o filtro vai para o SERVIDOR, e o recorte não acontece aqui", async () => {
      comInstancias();
      const pedidos: string[] = [];
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
          pedidos.push(new URL(request.url).search);
          return HttpResponse.json(page([item("an-1"), item("an-2")]));
        }),
      );
      renderList();
      expect(await screen.findByText("an-1")).toBeTruthy();

      await userEvent.selectOptions(await screen.findByRole("combobox"), "i-1");
      // A prova é a REDE: recortar no cliente quebraria o cursor e a contagem da página, e o
      // Front passaria a ter uma segunda opinião sobre o que pertence à Instância.
      await waitFor(() =>
        expect(pedidos.some((q) => q.includes("instance_id=i-1"))).toBe(true),
      );
    });

    it("trocar o filtro ZERA o cursor — token opaco não atravessa consultas", async () => {
      comInstancias();
      const pedidos: string[] = [];
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
          const q = new URL(request.url).search;
          pedidos.push(q);
          return HttpResponse.json(
            page([item("an-1")], q.includes("cursor=") ? null : "cur-2"),
          );
        }),
      );
      renderList();
      expect(await screen.findByText("an-1")).toBeTruthy();

      await userEvent.click(
        await screen.findByRole("button", { name: /^Next$/ }),
      );
      await waitFor(() =>
        expect(pedidos.some((q) => q.includes("cursor=cur-2"))).toBe(true),
      );

      await userEvent.selectOptions(screen.getByRole("combobox"), "i-1");
      // O cursor da listagem GERAL não pode ser enviado à listagem da Instância: ele é opaco e
      // pertence à consulta que o emitiu, e o backend não tem como recusar o próprio token.
      await waitFor(() => {
        const ultimo = pedidos[pedidos.length - 1];
        expect(ultimo, "o cursor atravessou a troca de filtro").not.toContain(
          "cursor=",
        );
        expect(ultimo).toContain("instance_id=i-1");
      });
    });

    it("filtrado e sem resultado NÃO é 'nenhuma análise ainda', e tem saída", async () => {
      comInstancias();
      server.use(
        http.get(`${MSW_BASE}/v1/analyses`, ({ request }) =>
          HttpResponse.json(
            new URL(request.url).searchParams.get("instance_id")
              ? page([])
              : page([item("an-1")]),
          ),
        ),
      );
      renderList();
      expect(await screen.findByText("an-1")).toBeTruthy();
      await userEvent.selectOptions(await screen.findByRole("combobox"), "i-1");

      // Há análises — só não nesta Instância. Dizer "nenhuma análise ainda" seria falso.
      expect(
        await screen.findByText(/No analyses in this instance yet/i),
      ).toBeTruthy();
      expect(screen.queryByText(/No analyses yet\. Start one/i)).toBeNull();
      // E o vazio devolve cedo, antes do seletor: sem uma saída própria isto seria um beco.
      await userEvent.click(
        screen.getByRole("button", { name: /Show every analysis/i }),
      );
      expect(await screen.findByText("an-1")).toBeTruthy();
    });
  });

  it("vazio REAL: mostra estado vazio (não após falha)", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => HttpResponse.json(page([]))),
    );
    renderList();
    expect(await screen.findByText(/No analyses yet/i)).toBeTruthy();
  });

  it("erro recuperável (503 temporarily_unavailable): mensagem + retry que refaz", async () => {
    let n = 0;
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => {
        n += 1;
        return n === 1
          ? problem("temporarily_unavailable", 503)
          : HttpResponse.json(page([item("an-ok")]));
      }),
    );
    renderList();
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/try again/i);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("an-ok")).toBeTruthy(); // NÃO mostrou "0 análises"
  });

  it("sessão expirada (401): mensagem própria, SEM botão de retry", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        problem("authentication_required", 401),
      ),
    );
    renderList();
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/session is no longer valid/i);
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });
});

describe("AnalysesListPage — paginação por cursor opaco", () => {
  it("página 1 → próxima envia o cursor recebido → volta; sem duplicação local", async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        const cur = new URL(request.url).searchParams.get("cursor");
        cursors.push(cur);
        if (cur === "cur-1")
          return HttpResponse.json(page([item("an-2")], null));
        return HttpResponse.json(page([item("an-1")], "cur-1"));
      }),
    );
    renderList();
    expect(await screen.findByText("an-1")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("an-2")).toBeTruthy();
    expect(screen.queryByText("an-1")).toBeNull(); // trocou de página (sem concatenar)

    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(await screen.findByText("an-1")).toBeTruthy();

    // 1ª página sem cursor; 2ª com o cursor OPACO exatamente como recebido
    expect(cursors[0]).toBeNull();
    expect(cursors).toContain("cur-1");
  });

  it("troca de workspace ZERA o cursor (não cruza workspace)", async () => {
    const reqs: { ws: string | null; cursor: string | null }[] = [];
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, ({ request }) => {
        const u = new URL(request.url);
        const ws = u.searchParams.get("workspace_id");
        const cursor = u.searchParams.get("cursor");
        reqs.push({ ws, cursor });
        if (ws === "ws-1" && cursor === null)
          return HttpResponse.json(page([item("a1")], "cur-x"));
        if (ws === "ws-1") return HttpResponse.json(page([item("a2")], null));
        return HttpResponse.json(page([item("b1")], null)); // ws-2
      }),
    );
    const { rerender } = renderList();
    expect(await screen.findByText("a1")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("a2")).toBeTruthy();

    // troca de workspace → efeito zera o cursor → 1ª página de ws-2 SEM cursor
    auth.ws = { id: "ws-2" };
    rerender(
      <LanguageProvider>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <CanonicalClientProvider client={client}>
            <MemoryRouter>
              <AnalysesListPage />
            </MemoryRouter>
          </CanonicalClientProvider>
        </QueryClientProvider>
      </LanguageProvider>,
    );
    expect(await screen.findByText("b1")).toBeTruthy();
    const ws2 = reqs.filter((r) => r.ws === "ws-2");
    expect(ws2.length).toBeGreaterThan(0);
    expect(ws2.every((r) => r.cursor === null)).toBe(true); // nenhum cursor de ws-1 vazou p/ ws-2
  });
});

describe("AnalysesListPage — acessibilidade (axe)", () => {
  async function violacoes(container: HTMLElement) {
    const r = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    return r.violations;
  }
  it("dados: hierarquia/lista/links sem violações", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(
          page([item("an-1"), item("an-2", "running", false)], "cur-2"),
        ),
      ),
    );
    const { container } = renderList();
    await screen.findByText("an-1");
    expect(await violacoes(container)).toEqual([]);
  });
  it("vazio: sem violações", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () => HttpResponse.json(page([]))),
    );
    const { container } = renderList();
    await screen.findByText(/No analyses yet/i);
    expect(await violacoes(container)).toEqual([]);
  });
  it("erro: alert acessível sem violações", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        problem("temporarily_unavailable", 503),
      ),
    );
    const { container } = renderList();
    await screen.findByRole("alert");
    expect(await violacoes(container)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// O LÉXICO DE VALOR NA LINHA — ausência não é zero
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// O contrato de `AnalysisListItem` diz, sobre `observed_conversations`, que `null` significa
// **ausente, nunca zero**, e que *"renderizar 0 ou '—' como se fosse medição transformaria
// não-medição em fato"*. A regra estava escrita no contrato e não era medida em lugar nenhum:
// a lista simplesmente descartava o campo, então nenhuma asserção podia falhar.
//
// Estes casos existem para que ela passe a ter dentes. O primeiro prova que o número medido
// chega à tela; o segundo, que a ausência é omitida em vez de virar zero ou ruído visual.

describe("AnalysesListPage · o léxico de valor na linha", () => {
  const comConversas = (id: string, observadas: number | null) => ({
    analysis_id: id,
    status: "completed" as AnalysisStatus,
    record_count: 5,
    result_available: true,
    created_at: "2020-01-02T00:00:00Z",
    observed_conversations: observadas,
    instance_id: null,
  });

  it("conversas observadas chegam à tela quando o produtor as publica", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(page([comConversas("an-medida", 12480) as never])),
      ),
    );
    renderList();
    // `toLocaleString` decide o separador pelo ambiente; a asserção olha os dígitos, não a
    // pontuação — senão o caso reprova numa máquina com outro locale e ninguém entende por quê.
    await waitFor(() => {
      const texto = document.body.textContent ?? "";
      expect(texto.replace(/[.,\s]/g, "")).toContain("12480");
    });
  });

  it("ausência omite a medida ruidosa, e a tela não inventa zero nem 'não publicado'", async () => {
    server.use(
      http.get(`${MSW_BASE}/v1/analyses`, () =>
        HttpResponse.json(page([comConversas("an-ausente", null) as never])),
      ),
    );
    const { container } = renderList();

    await screen.findByText(/an-ausente/);

    expect(container.querySelector(".medida-ausente")).toBeNull();
    expect(screen.queryByText(/not published/i)).toBeNull();
    expect(screen.queryByText(/count not published/i)).toBeNull();

    // E o antifato: nenhum `0` aparece como se fosse a contagem observada. Sem este caso, um
    // `?? 0` acidental no futuro passaria — a hachura continuaria lá, desenhada sobre um zero.
    const numeros = Array.from(container.querySelectorAll(".tabular")).map(
      (n) => n.textContent?.trim(),
    );
    expect(numeros).not.toContain("0");
  });
});
