// M12 — a marginália de procedência, provada onde ela costuma falhar.
//
// Um pattern responsivo falha de um jeito específico e silencioso: ele funciona no desktop de quem
// o escreveu, e no mobile a informação simplesmente não está lá. Ninguém abre um bug — quem lê no
// celular não sabe que existia algo para ler. Por isso o mobile aqui não é "mais um caso": é o
// caso principal, e a A3 o trata como parte do aceite, não como retrofit.
//
// ## O que jsdom prova e o que não prova
//
// jsdom não aplica CSS. `hidden md:block` não esconde nada aqui: as duas versões da margem ficam
// no DOM, e é assim que o teste consegue afirmar que **as duas existem** — que é justamente a
// garantia da A3 ("nunca some"). O que o teste NÃO pode afirmar é qual delas o navegador pinta;
// isso está nas classes, e as classes são verificadas literalmente.
//
// Escrever este teste esperando que só uma versão apareça seria testar o navegador dentro do
// jsdom, e ele passaria por motivo errado.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProvenanceMargin, type ItemDeProcedencia } from "./ProvenanceMargin";

/** EN curto × PT-BR longo — o par de D37 que exercita o orçamento de +30 %. */
const COPY = {
  en: {
    indicador: "Conformity rate",
    margem: "Provenance",
    ausente: "Not reported",
    itens: [
      { rotulo: "Records", valor: "1,234" },
      { rotulo: "Method", valor: "Direct count" },
    ],
  },
  pt: {
    indicador: "Taxa de conformidade",
    margem: "Procedência",
    ausente: "Não informado",
    itens: [
      { rotulo: "Registros", valor: "1.234" },
      { rotulo: "Método", valor: "Contagem direta" },
    ],
  },
} as const;

function comLargura(largura: number) {
  return (ui: React.ReactElement) => {
    const container = document.createElement("div");
    container.style.width = `${largura}px`;
    document.body.appendChild(container);
    return render(ui, { container });
  };
}

function montar(
  idioma: keyof typeof COPY,
  procedencia?: readonly ItemDeProcedencia[],
): React.ReactElement {
  const c = COPY[idioma];
  return (
    <ProvenanceMargin
      rotuloDoIndicador={c.indicador}
      rotuloDaMargem={c.margem}
      textoQuandoAusente={c.ausente}
      procedencia={procedencia ?? c.itens}
    >
      <span>63,0%</span>
    </ProvenanceMargin>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. A3 — a marginália NUNCA some, e no mobile fica presa ao dado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M12 · A3 · a procedência sobrevive ao mobile", () => {
  it("a versão MOBILE existe — há um disclosure com a margem", () => {
    // A prova de "nunca some". Se alguém trocar o bloco mobile por nada, ou por um `md:block`
    // que o esconde no celular, este caso morre.
    comLargura(375)(montar("pt"));
    const gatilho = screen.getByRole("button", { name: COPY.pt.margem });
    expect(gatilho).toBeInTheDocument();
  });

  it("a versão DESKTOP existe e é PERSISTENTE — sem clique, sem hover", () => {
    const { container } = comLargura(1280)(montar("pt"));
    const persistente = container.querySelector(".hidden.md\\:block");
    expect(persistente, "não há bloco persistente de desktop").not.toBeNull();
    // O conteúdo está lá desde a montagem: nada de `hidden`, nada de estado.
    expect(within(persistente as HTMLElement).getByText("1.234")).toBeInTheDocument();
  });

  it("o bloco persistente é escondido ABAIXO de tablet, e o disclosure ACIMA", () => {
    // As classes são o contrato responsivo. jsdom não as aplica, então elas são lidas.
    const { container } = comLargura(375)(montar("pt"));
    const persistente = container.querySelector(".hidden.md\\:block");
    const colapsavel = container.querySelector(".md\\:hidden");
    expect(persistente, "bloco de desktop ausente").not.toBeNull();
    expect(colapsavel, "bloco colapsável de mobile ausente").not.toBeNull();
  });

  it("as duas versões carregam a MESMA informação", async () => {
    // Uma margem mobile "resumida" é informação perdida com aparência de decisão de design.
    //
    // A margem colapsada só MONTA o conteúdo quando abre — o `Disclosure` é assim de propósito,
    // e o `aria-controls` continua apontando para a região mesmo fechada. Por isso a igualdade é
    // provada DEPOIS de abrir: comparar com o disclosure fechado mediria o lazy render, não a
    // paridade de informação, e passaria pelo motivo errado.
    const user = userEvent.setup();
    comLargura(375)(montar("pt"));
    await user.click(screen.getByRole("button", { name: COPY.pt.margem }));

    for (const t of ["1.234", "Contagem direta", "Registros", "Método"]) {
      expect(screen.getAllByText(t).length, `\`${t}\` não está nas duas versões`).toBe(2);
    }
  });

  it("a margem está PRESA ao dado — mesmo grupo, nomeado pelo indicador", () => {
    // "Presa ao dado" tem de ser verdade para o leitor de tela, não só na pintura: o grupo é
    // nomeado pelo indicador e contém tanto o valor quanto a procedência.
    comLargura(375)(montar("pt"));
    const grupo = screen.getByRole("group", { name: COPY.pt.indicador });
    expect(within(grupo).getByText("63,0%")).toBeInTheDocument();
    expect(within(grupo).getByRole("button", { name: COPY.pt.margem })).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Nunca só hover · teclado ponta a ponta
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M12 · a informação não depende de apontar o mouse", () => {
  it("o gatilho é um `<button>` de verdade, não um `div` com onMouseOver", () => {
    // Não existe hover no toque. Um gatilho que só responde ao mouse remove a procedência de
    // todo mundo que lê no celular — e de quem navega por teclado.
    comLargura(375)(montar("pt"));
    const gatilho = screen.getByRole("button", { name: COPY.pt.margem });
    expect(gatilho.tagName).toBe("BUTTON");
    expect(gatilho).toHaveAttribute("aria-expanded");
    expect(gatilho).toHaveAttribute("aria-controls");
  });

  it("abre pelo TECLADO e anuncia o estado", async () => {
    const user = userEvent.setup();
    comLargura(375)(montar("pt"));
    const gatilho = screen.getByRole("button", { name: COPY.pt.margem });

    expect(gatilho).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(gatilho).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(gatilho).toHaveAttribute("aria-expanded", "true");

    const regiao = document.getElementById(gatilho.getAttribute("aria-controls") ?? "");
    expect(regiao, "`aria-controls` aponta para o vazio").not.toBeNull();
    expect(regiao).not.toHaveAttribute("hidden");
    expect(within(regiao as HTMLElement).getByText("1.234")).toBeInTheDocument();
  });

  it("o alvo do gatilho respeita 44×44", () => {
    comLargura(375)(montar("pt"));
    const gatilho = screen.getByRole("button", { name: COPY.pt.margem });
    expect(gatilho.getAttribute("class") ?? "").toContain("min-h-[44px]");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Ausência é declarada — nunca inventada, nunca julgada
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M12 · o que não se sabe não vira número", () => {
  it("`valor: null` vira a palavra do produto, nunca `0` nem `—`", () => {
    // Um zero no lugar de um desconhecido é a tela afirmando algo que ninguém mediu.
    comLargura(1280)(
      montar("pt", [
        { rotulo: "Registros", valor: null },
        { rotulo: "Método", valor: "Contagem direta" },
      ]),
    );
    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("procedência vazia NÃO faz a margem sumir", () => {
    // "Não sei de onde veio" não é motivo para o número voltar a aparecer sozinho — é exatamente
    // o defeito de origem que a V9 fecha.
    comLargura(375)(montar("pt", []));
    expect(screen.getByRole("button", { name: COPY.pt.margem })).toBeInTheDocument();
    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(0);
  });

  it("ausência não é apresentada como evidência NEGATIVA", () => {
    // O texto exibido é o que o produto passou, sem adjetivo. O DS não escreve "sem procedência",
    // "não confiável" nem qualquer julgamento — ele não tem autoridade para isso.
    const { container } = comLargura(1280)(montar("pt", []));
    const texto = (container.textContent ?? "").toLowerCase();
    // Adjetivos, não números: a primeira versão deste caso procurava `"0%"` e casava com o
    // próprio indicador `63,0%` — reprovava o dado legítimo em vez do julgamento. O zero
    // inventado já é coberto pelo caso de `valor: null` acima.
    for (const julgamento of ["não confiável", "inválido", "baixa confiança", "insuficiente"]) {
      expect(texto, `o DS emitiu um julgamento: "${julgamento}"`).not.toContain(julgamento);
    }
  });

  it("o texto de ausência vem do PRODUTO, e muda com o idioma", () => {
    // Se o DS escolhesse a palavra, escolheria o idioma e o tom de uma afirmação sobre o que o
    // cliente não tem. Essa decisão não é dele.
    comLargura(1280)(montar("en", []));
    expect(screen.getAllByText("Not reported").length).toBeGreaterThan(0);
    expect(screen.queryByText("Não informado")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O pattern não formata, não calcula, não conhece domínio
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M12 · o pattern exibe, e só", () => {
  it("o indicador chega pronto — o pattern não formata número", () => {
    comLargura(1280)(montar("pt"));
    expect(screen.getByText("63,0%")).toBeInTheDocument();
  });

  it("os valores da margem saem como chegaram, sem arredondar nem derivar", () => {
    comLargura(1280)(
      montar("pt", [{ rotulo: "Registros", valor: "1.234.567,89" }]),
    );
    expect(screen.getAllByText("1.234.567,89").length).toBeGreaterThan(0);
  });
});
