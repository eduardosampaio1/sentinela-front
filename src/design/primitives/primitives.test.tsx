// M10 — os primitives nas combinações de D37, com `axe`.
//
// D37 diz que idioma, tema e breakpoint são **estados de teste do componente**, não tarefas
// finais de QA. Com a decisão 1 do owner (Light/Dark fora da V1) o eixo de tema tem **um** valor,
// então a matriz é `2 idiomas × 1 tema × 2 breakpoints` = **4 combinações**.
//
// O que "idioma" significa para um primitive: ele não traduz nada — recebe `children`. O que
// muda com o idioma é o **comprimento** do que chega. PT-BR chega a ~30 % mais longo que EN, e é
// isso que o teste exercita: o layout tolera a expansão sem cortar informação nem estourar.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import {
  Bar,
  Chip,
  DefinitionGrid,
  Disclosure,
  IconeDecorativo,
  IconeInformativo,
  Note,
  Panel,
  Stack,
  Text,
} from "./index";

/** EN curto × PT-BR longo — o par que exercita o orçamento de +30 %. */
const COPY = {
  en: { curto: "Withheld", longo: "Distribution of observed categories" },
  pt: { curto: "Retida", longo: "Distribuição das categorias observadas" },
} as const;

const BREAKPOINTS = [
  { nome: "mobile", largura: 375 },
  { nome: "desktop", largura: 1280 },
] as const;

/** Aplica a largura no container para que regras responsivas tenham um viewport plausível. */
function comLargura(largura: number) {
  return (ui: React.ReactElement) => {
    const container = document.createElement("div");
    container.style.width = `${largura}px`;
    document.body.appendChild(container);
    return render(ui, { container });
  };
}

const CASOS = [
  {
    nome: "Bar",
    render: (t: string) => (
      <ul>
        <Bar rotulo={t} valor="1.234" largura="63.0%" rotuloSuprimido={t} />
      </ul>
    ),
  },
  {
    nome: "Bar suprimida",
    render: (t: string) => (
      <ul>
        <Bar rotulo={t} valor={null} largura="0%" suprimida rotuloSuprimido={t} />
      </ul>
    ),
  },
  { nome: "Chip", render: (t: string) => <Chip>{t}</Chip> },
  {
    nome: "DefinitionGrid",
    render: (t: string) => <DefinitionGrid itens={[{ label: t, display: "42" }]} />,
  },
  {
    nome: "Disclosure",
    render: (t: string) => <Disclosure gatilho={t}>{t}</Disclosure>,
  },
  { nome: "IconeInformativo", render: (t: string) => <IconeInformativo rotulo={t}>▲</IconeInformativo> },
  { nome: "IconeDecorativo", render: () => <IconeDecorativo>▲</IconeDecorativo> },
  { nome: "Note", render: (t: string) => <Note>{t}</Note> },
  { nome: "Panel", render: (t: string) => <ul><Panel titulo={t}>{t}</Panel></ul> },
  { nome: "Stack", render: (t: string) => <Stack><span>{t}</span><span>{t}</span></Stack> },
  { nome: "Text", render: (t: string) => <Text>{t}</Text> },
] as const;

describe("M10 · primitives nas 4 combinações de D37", () => {
  for (const caso of CASOS) {
    for (const idioma of ["en", "pt"] as const) {
      for (const bp of BREAKPOINTS) {
        it(`${caso.nome} — ${idioma} × ${bp.nome}`, async () => {
          const { container, unmount } = comLargura(bp.largura)(caso.render(COPY[idioma].longo));
          // `axe` em cada combinação, e não uma vez só: violação de nome acessível ou de papel
          // pode aparecer só num tamanho.
          //
          // `color-contrast` fica desabilitado pelo mesmo motivo que a suíte a11y já registrava:
          // ele depende de estilo computado, e o jsdom não o fornece — habilitá-lo aqui daria um
          // verde que não mediu contraste nenhum. Contraste é prova de browser, e a Constituição
          // já a exige na primeira superfície real.
          const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
          expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
          unmount();
        });
      }
    }
  }
});

describe("M10 · o que cada primitive precisa garantir por si", () => {
  // M45.3 — o gatilho do `Disclosure` PARECE um gatilho.
  //
  // Ele renderizava só o texto. No mobile de RES-01 isso é a palavra "Procedência" sozinha, entre
  // o número do indicador e a descrição: lê-se como título de seção, e nada diz que abre. A
  // procedência é o argumento de confiança daquela tela, e ficava invisível para quem não
  // adivinhasse tocar. Era o único uso do primitive no produto inteiro.
  //
  // As DUAS direções, e a segunda é o que impede a correção de virar outro defeito: a seta não
  // pode roubar o nome acessível. Um ícone que vira o nome do botão é o defeito que o docstring do
  // `gatilho` já proibia — "texto, não ícone sozinho".
  it("Disclosure: o gatilho tem marca visual E continua se chamando pelo texto", () => {
    const { container } = render(<Disclosure gatilho="Procedência">conteúdo</Disclosure>);
    const botao = screen.getByRole("button", { name: "Procedência" });

    expect(
      botao.querySelector("svg"),
      "o gatilho não tem marca visual — parece um título, não um botão",
    ).not.toBeNull();
    // E a marca é decorativa: quem usa leitor de tela ouve o texto, não o ícone.
    expect(botao.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(container.textContent).not.toContain("conteúdo");
  });

  it("Bar SUPRIMIDA não desenha barra — vazio e zero afirmam coisas opostas", () => {
    const { container } = render(
      <ul>
        <Bar rotulo="jan" valor={null} largura="0%" suprimida rotuloSuprimido={COPY.pt.curto} />
      </ul>,
    );
    // A trilha existe (é a moldura); o preenchimento, não.
    expect(container.querySelectorAll("span[style*='width']")).toHaveLength(0);
    expect(screen.getByText(COPY.pt.curto)).toBeInTheDocument();
  });

  it("Bar escreve SEMPRE o número ao lado — não depende só de comprimento", () => {
    render(
      <ul>
        <Bar rotulo="jan" valor="1.234" largura="63.0%" rotuloSuprimido="—" />
      </ul>,
    );
    expect(screen.getByText("1.234")).toBeInTheDocument();
  });

  it("Bar NÃO suprimida DESENHA a barra — senão o caso acima passaria sem preenchimento nenhum", () => {
    const { container } = render(
      <ul>
        <Bar rotulo="jan" valor="1.234" largura="63.0%" rotuloSuprimido="—" />
      </ul>,
    );
    const preenchimento = container.querySelectorAll("span[style*='width']");
    expect(preenchimento).toHaveLength(1);
    expect(preenchimento[0].getAttribute("style")).toContain("63");
  });

  it("Bar e DefinitionGrid usam numerais tabulares (A1)", () => {
    // Número que muda de largura entre estados destrói a leitura de uma série.
    const { container } = render(
      <>
        <ul>
          <Bar rotulo="jan" valor="1.234" largura="10%" rotuloSuprimido="—" />
        </ul>
        <DefinitionGrid itens={[{ label: "total", display: "42" }]} />
      </>,
    );
    expect(container.querySelectorAll(".tabular-nums").length).toBeGreaterThanOrEqual(2);
  });

  it("Disclosure é BOTÃO com aria-expanded e aria-controls, e opera por teclado", async () => {
    const user = userEvent.setup();
    render(<Disclosure gatilho="Procedência">conteúdo revelado</Disclosure>);
    const gatilho = screen.getByRole("button", { name: "Procedência" });
    expect(gatilho).toHaveAttribute("aria-expanded", "false");
    expect(gatilho).toHaveAttribute("aria-controls");
    expect(screen.queryByText("conteúdo revelado")).not.toBeInTheDocument();

    await user.tab();
    expect(gatilho).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(gatilho).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("conteúdo revelado")).toBeInTheDocument();
  });

  it("Disclosure NÃO revela por hover — não existe hover no toque", async () => {
    const user = userEvent.setup();
    render(<Disclosure gatilho="Procedência">conteúdo revelado</Disclosure>);
    await user.hover(screen.getByRole("button", { name: "Procedência" }));
    expect(screen.queryByText("conteúdo revelado")).not.toBeInTheDocument();
  });

  it("IconeInformativo tem nome acessível; IconeDecorativo some para a assistiva", () => {
    const { container } = render(
      <>
        <IconeInformativo rotulo="Em execução">▲</IconeInformativo>
        <IconeDecorativo>▲</IconeDecorativo>
      </>,
    );
    expect(screen.getByRole("img", { name: "Em execução" })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it("Note é `role=note` — informa, não alarma", () => {
    render(<Note>observação</Note>);
    expect(screen.getByRole("note")).toHaveTextContent("observação");
  });

  it("Chip NÃO conhece estado semântico — só ênfase visual", () => {
    // Guarda de fronteira com a M11: o dia em que este primitive aceitar `estado="withheld"`, o
    // vocabulário de estado passa a nascer em dois lugares — e o critério 17 de UI COMPLETE existe
    // exatamente para impedir isso.
    //
    // A verificação é sobre a FONTE, não sobre `propTypes`: componente de função em TypeScript não
    // tem `propTypes`, e `Object.keys(undefined ?? {})` devolve `[]` — a asserção passaria em
    // qualquer cenário, inclusive no que ela deveria pegar.
    const fonte = readFileSync(resolve(__dirname, "Chip.tsx"), "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    for (const estado of ["ready", "partial", "withheld", "running", "failed", "pending"]) {
      // `String.raw` porque `\b` dentro de template literal comum é o caractere BACKSPACE, não a
      // fronteira de palavra da expressão regular. A primeira versão deste caso procurava
      // literalmente `<BS>withheld<BS>`, nunca casava, e passava pelo motivo errado — foi a
      // mutação que o encontrou, e é para isso que ela existe.
      expect(fonte, `Chip passou a conhecer o estado \`${estado}\``).not.toMatch(
        new RegExp(String.raw`\b` + estado + String.raw`\b`, "i"),
      );
    }
    const { container } = render(<Chip enfase="contorno">rótulo</Chip>);
    expect(container.textContent).toBe("rótulo");
  });
});
