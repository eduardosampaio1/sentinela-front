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
    const nomes = [...container.querySelectorAll("ul > li span[title]")].map((e) =>
      e.textContent?.trim(),
    );
    expect(nomes).toEqual(["cancelamento", "suporte.tecnico", "cobranca.segunda_via"]);
  });

  it("a lista de DETALHE segue a MESMA ordem da barra", () => {
    // Duas listas em ordens diferentes seriam pior que nenhuma ordem: o leitor casaria a
    // primeira barra com o primeiro detalhe, e eles seriam de intenções distintas.
    const { container } = montar();
    const detalhe = [...container.querySelectorAll("dl > div > dt")].map((e) =>
      e.textContent?.trim(),
    );
    expect(detalhe).toEqual(["cancelamento", "suporte.tecnico", "cobranca.segunda_via"]);
  });

  it("o número ao lado da barra é o ESCORE — o que a barra mede", () => {
    const { container } = montar();
    const primeira = container.querySelector("ul > li") as HTMLElement;
    // `cancelamento` tem escore 10 e suporte 1. Se o `1` aparecesse aqui, a barra estaria
    // medindo uma coisa e escrevendo outra.
    expect(within(primeira).getByText("10")).toBeInTheDocument();
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
    const nomes = [...container.querySelectorAll("ul > li span[title]")].map((e) =>
      e.textContent?.trim(),
    );
    expect(nomes).toEqual(["medida", "sem_amostra"]);
  });
});
