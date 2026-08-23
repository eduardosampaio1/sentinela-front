// O RANKING na tela: a ordem RENDERIZADA, não só a da função pura.
//
// `ranking.test.ts` prova a ordenação. Este arquivo prova que ela chega ao DOM — e os dois são
// necessários porque o componente podia ordenar e depois renderizar `intents` (a prop original)
// em vez de `ordenadas`. Foi exatamente o erro possível: `ordenadas` alimenta a barra, e a lista
// de detalhe abaixo dela é um segundo `map`.

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { PublicIntent } from "@/lib/v1/contract/public-v3.types";

import { Intencoes } from "./Intencoes";

/** A massa REAL de hoje, na ordem em que o documento a entrega. */
const REAIS: readonly [string, number, number][] = [
  ["cancelamento", 10, 1],
  ["cobranca.segunda_via", 80, 8],
  ["suporte.tecnico", 22.5, 5],
];

const intencao = (id: string, valor: number, support: number) =>
  ({
    intent_id: id,
    support,
    underrepresented: false,
    score: {
      id: "intent_score",
      value: valor,
      availability: "measured",
      reason: "ok",
      scale: { kind: "score_100", minimum: null, maximum: null },
    },
  }) as unknown as PublicIntent;

function montar(massa = REAIS) {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <Intencoes
        intents={massa.map(([id, v, s]) => intencao(id, v, s))}
        pisoDeAmostra={5}
      />
    </LanguageProvider>,
  );
}

describe("Intenções na tela · o pior primeiro", () => {
  it("a BARRA sai ordenada: `cancelamento` sai do meio para o topo", () => {
    const { container } = montar();
    // A consulta mudou de `ul > li` para a primeira célula de cada linha: a apresentação virou
    // TABELA no port do Molde V4. A afirmação é a mesma — pior primeiro.
    const nomes = [...container.querySelectorAll("tbody tr td:first-child > span")].map((e) =>
      e.textContent?.trim(),
    );
    expect(nomes).toEqual(["cancelamento", "suporte.tecnico", "cobranca.segunda_via"]);
  });

  it("o detalhe de cada intenção está NA LINHA dela", () => {
    // Antes eram duas listas paralelas — barras em cima, detalhes embaixo — e o risco era elas
    // saírem em ordens diferentes: o leitor casaria a primeira barra com o primeiro detalhe, e
    // seriam de intenções distintas.
    //
    // A tabela elimina o risco pela estrutura, e este caso passa a prová-lo: o suporte de cada
    // intenção está dentro da MESMA linha que leva o nome dela.
    const { container } = montar();
    const linhas = [...container.querySelectorAll("tbody tr")];
    expect(linhas).toHaveLength(3);
    const primeira = linhas[0] as HTMLElement;
    expect(primeira.textContent).toContain("cancelamento");
    // `cancelamento` tem suporte 1 na massa.
    expect(within(primeira).getByText("1")).toBeInTheDocument();
  });

  it("o número ao lado da barra é o ESCORE — o que a barra mede", () => {
    const { container } = montar();
    // A COLUNA do escore, e não a linha inteira: o suporte também mora na linha, e procurar
    // nela toda deixaria de distinguir uma coisa da outra — que é justamente o que este caso
    // existe para distinguir.
    const celula = container.querySelector("tbody tr td:nth-child(2)") as HTMLElement;
    // `cancelamento` tem escore 10 e suporte 1. Se o `1` aparecesse aqui, a coluna estaria
    // medindo uma coisa e escrevendo outra.
    expect(within(celula).getByText("10")).toBeInTheDocument();
    expect(within(celula).queryByText("1")).toBeNull();
  });

  it("o SUPORTE continua na tela, na linha de detalhe", () => {
    // A primeira versão desta mudança tirou o suporte da barra e ele sumiu da tela inteira —
    // o comentário do código afirmava que ele estava no detalhe, e não estava.
    montar();
    const rotulos = screen.getAllByText(/Suporte amostral/);
    expect(rotulos).toHaveLength(3);
  });

  it("intenção SEM escore vai para o fim, e não some", () => {
    const { container } = render(
      <LanguageProvider>
        <Intencoes
          intents={[
            { ...(intencao("sem_amostra", 0, 0) as object), score: { id: "intent_score", value: null, availability: "not_measured", reason: "insufficient_sample", scale: { kind: "score_100", minimum: null, maximum: null } } } as unknown as PublicIntent,
            intencao("medida", 40, 9),
          ]}
          pisoDeAmostra={5}
        />
      </LanguageProvider>,
    );
    const nomes = [...container.querySelectorAll("tbody tr td:first-child > span")].map((e) =>
      e.textContent?.trim(),
    );
    expect(nomes).toEqual(["medida", "sem_amostra"]);
  });
});
