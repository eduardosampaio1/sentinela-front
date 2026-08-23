// Medidas passa a dizer POR QUE está sem conteúdo.
//
// ## O defeito
//
// Medido com print em homologação: a pessoa sobe a base, confirma o mapeamento, espera o motor
// e chega em Medidas para ver seis títulos com nada embaixo. A tela está CERTA — sem dimensão
// declarada não há o que abrir — e ainda assim parece defeituosa.
//
// O custo não é técnico, é de confiança. O Diagnóstico já resolve isso na faixa de parcialidade;
// esta é a irmã dela.
//
// ## O caso mais importante deste arquivo é o NEGATIVO
//
// Uma faixa que aparecesse sempre "passaria" no caso positivo e destruiria a tela cheia,
// dizendo que não há nada aberto por campo logo acima da distribuição por canal. É o par que
// prova: aparece quando falta, some quando tem.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";
import { AnalyticsView } from "./AnalyticsView";

vi.mock("@/shell/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/** O snapshot vazio de uma análise que atravessou tudo sem declarar dimensão. */
function vazio(troca: Partial<SnapshotAnalitico> = {}): SnapshotAnalitico {
  return {
    snapshot_contract_version: "analytics-snapshot-v9",
    record_count: 300,
    numeric: [],
    distributions: [],
    dimensions: [],
    concentrations: [],
    time_series: [],
    blocosNaoApresentados: 0,
    medidasNaoResumidas: 0,
    medidasNaoAutorizadas: 0,
    blocosIlegiveis: 0,
    ...troca,
  };
}

/** Uma dimensão publicada, na forma que a tela lê. */
const DIMENSAO = {
  measurement: { id: "channel", method_id: "categorical_count", method_version: "v1" },
  entradas: [{ rotulo: "whatsapp", contagem: 153 }],
  suprimidos: 0,
  minimo_do_grupo: 10,
} as unknown as SnapshotAnalitico["dimensions"][number];

/**
 * Renderiza só a faixa, alimentando o componente pela função exportada da própria tela.
 *
 * Montar `AnalyticsView` inteira exigiria rota, cliente e MSW — e faria este arquivo medir a
 * página em vez da regra. O que importa aqui é uma decisão de três condições.
 */
async function faixa(snapshot: SnapshotAnalitico) {
  const { PorQueEstaVazio } = (await import("./AnalyticsView")) as unknown as {
    PorQueEstaVazio: (p: { snapshot: SnapshotAnalitico }) => JSX.Element | null;
  };
  return render(
    <LanguageProvider>
      <PorQueEstaVazio snapshot={snapshot} />
    </LanguageProvider>,
  );
}

describe("a tela diz por que está vazia", () => {
  it("sem nada aberto por campo, explica e mostra o caminho", async () => {
    const { unmount } = await faixa(vazio());

    expect(screen.getByText("Nothing is broken down by field")).toBeTruthy();
    // O caminho importa mais que o diagnóstico: é ele que transforma a tela num beco a menos.
    expect(screen.getByText(/Group the results by/)).toBeTruthy();
    unmount();
  });

  it("NÃO afirma que ninguém declarou dimensão", async () => {
    // A recusa é deliberada. Uma dimensão declarada cujos grupos ficassem todos abaixo do piso
    // de supressão poderia chegar aqui vazia do mesmo jeito — e a frase acusaria a pessoa de não
    // ter feito algo que ela fez.
    //
    // Afirmar causa interna a partir de ausência é a mesma família do defeito que pôs todo
    // dataset em quarentena por silêncio do object store.
    const { unmount } = await faixa(vazio());
    const texto = document.body.textContent ?? "";

    expect(texto).not.toMatch(/did not declare|was not declared|no dimension was/i);
    unmount();
  });

  it("some quando há dimensão publicada", async () => {
    // O caso que prova o par. Sem ele, uma faixa incondicional passaria no teste acima e
    // apareceria em cima da distribuição por canal, dizendo que não há nada aberto por campo.
    const { unmount } = await faixa(vazio({ dimensions: [DIMENSAO] }));
    expect(screen.queryByText("Nothing is broken down by field")).toBeNull();
    unmount();
  });

  it("some quando há série temporal, mesmo sem dimensão categórica", async () => {
    // As duas regiões dependem de declaração, e uma só já basta para a tela ter resposta.
    const serie = { measurement: { id: "timestamp" }, pontos: [] } as unknown as
      SnapshotAnalitico["time_series"][number];
    const { unmount } = await faixa(vazio({ time_series: [serie] }));
    expect(screen.queryByText("Nothing is broken down by field")).toBeNull();
    unmount();
  });

  it("some quando não há registro nenhum", async () => {
    // Aí o problema é outro — e o estado do componente, que fica acima, já fala dele. Explicar
    // agrupamento para quem não tem dado seria responder a pergunta errada.
    const { unmount } = await faixa(vazio({ record_count: 0 }));
    expect(screen.queryByText("Nothing is broken down by field")).toBeNull();
    unmount();
  });
});
