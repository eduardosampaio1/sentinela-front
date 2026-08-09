// M13 — as provas dos nove patterns.
//
// Além das 4 combinações de D37 com `axe`, cada pattern carrega a asserção do que ele existe para
// impedir. Um pattern que só renderiza sem quebrar não provou nada: o que importa é que ele torne
// o defeito **impossível**, não improvável.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import {
  ActionRequired,
  ActionRequiredSemOperacao,
  ComparisonRow,
  ComparisonRowQuebrada,
  ConfirmDestructive,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressiveState,
  ProvenanceMargin,
  Toolbar,
} from "./index";

const COPY = {
  en: "Nothing here yet — send a data set to get started",
  pt: "Nada aqui ainda — envie um conjunto de dados para começar",
} as const;

const BREAKPOINTS = [
  { nome: "mobile", largura: 375 },
  { nome: "desktop", largura: 1280 },
] as const;

function renderEm(largura: number, ui: React.ReactElement) {
  const c = document.createElement("div");
  c.style.width = `${largura}px`;
  document.body.appendChild(c);
  return render(ui, { container: c });
}

const CASOS = [
  { nome: "EmptyState", render: (t: string) => <EmptyState titulo={t} explicacao={t} acao={<button>{t}</button>} /> },
  { nome: "ErrorState", render: (t: string) => <ErrorState titulo={t} explicacao={t} acao="tentar" botao={<button>{t}</button>} detalhe="capacity_wait" /> },
  { nome: "LoadingState", render: (t: string) => <LoadingState rotulo={t} /> },
  {
    nome: "ProgressiveState",
    render: (t: string) => (
      <ProgressiveState
        eixos={[
          { id: "engine", rotulo: t, estado: "running", rotuloDoEstado: t },
          { id: "analytics", rotulo: t, estado: "withheld", rotuloDoEstado: t },
        ]}
      />
    ),
  },
  { nome: "ActionRequired", render: (t: string) => <ActionRequired titulo={t} explicacao={t} rotuloDoEstado={t} acao={<button>{t}</button>} /> },
  { nome: "ActionRequiredSemOperacao", render: (t: string) => <ActionRequiredSemOperacao titulo={t} explicacao={t} rotuloDoEstado={t} motivo={t} /> },
  { nome: "ConfirmDestructive", render: (t: string) => <ConfirmDestructive titulo={t} consequencias={<p>{t}</p>} rotuloDoCampo={t} nomeExigido="Produção" acao={(h) => <button disabled={!h}>{t}</button>} /> },
  {
    nome: "DataTable",
    render: (t: string) => (
      <DataTable
        legenda={t}
        colunas={[
          { chave: "a", rotulo: t, celula: (l: { a: string }) => l.a },
          { chave: "n", rotulo: t, celula: () => "1.234", numerica: true },
        ]}
        linhas={[{ a: t }]}
        chaveDaLinha={(l) => l.a}
      />
    ),
  },
  { nome: "ComparisonRow", render: (t: string) => <ComparisonRow rotulo={t} antes="10" depois="12" base={t} delta="+2" /> },
  { nome: "ComparisonRowQuebrada", render: (t: string) => <ComparisonRowQuebrada rotulo={t} antes="10" depois="12" base={t} motivo={t} /> },
  {
    nome: "ProvenanceMargin",
    render: (t: string) => (
      <ProvenanceMargin
        rotuloDoIndicador={t}
        rotuloDaMargem={t}
        textoQuandoAusente={t}
        procedencia={[{ rotulo: t, valor: "1.234" }]}
      >
        <span>63,0%</span>
      </ProvenanceMargin>
    ),
  },
  { nome: "Toolbar", render: (t: string) => <Toolbar primaria={<button>{t}</button>} /> },
] as const;

describe("M13 · os 9 patterns nas 4 combinações de D37", () => {
  for (const caso of CASOS) {
    for (const idioma of ["en", "pt"] as const) {
      for (const bp of BREAKPOINTS) {
        it(`${caso.nome} — ${idioma} × ${bp.nome}`, async () => {
          const { container, unmount } = renderEm(bp.largura, caso.render(COPY[idioma]));
          // `color-contrast` desabilitado: o jsdom não computa cor. O contraste dos tons é provado
          // por aritmética em `contraste-de-estado.test.ts`.
          const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
          expect(r.violations.map((v) => v.id)).toEqual([]);
          unmount();
        });
      }
    }
  }
});

describe("M13 · o que cada pattern torna IMPOSSÍVEL", () => {
  it("EmptyState é `status`, não `alert` — vazio não é erro", () => {
    render(<EmptyState titulo="t" explicacao="e" acao={<button>a</button>} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ErrorState com ação declarada e SEM botão explode em vez de mentir", () => {
    // Um erro que diz "tente de novo" e não oferece o caminho é pior que um erro mudo.
    expect(() =>
      render(<ErrorState titulo="t" explicacao="e" acao="tentar" />),
    ).toThrow(/sem botão/);
    // E `nenhuma` não exige botão: há erros sem saída, e fingir uma seria pior.
    expect(() => render(<ErrorState titulo="t" explicacao="e" acao="nenhuma" />)).not.toThrow();
  });

  it("LoadingState NUNCA mostra percentual, e o rótulo sobrevive sem movimento", () => {
    const { container } = render(<LoadingState rotulo="Carregando" />);
    expect(container.textContent).not.toMatch(/\d+\s*%/);
    // O rótulo existe para leitor de tela e reaparece quando a animação é removida.
    expect(screen.getAllByText("Carregando").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("ProgressiveState usa identidade ESTÁVEL como chave, não o rótulo traduzido", () => {
    // Dois eixos com o mesmo texto não podem colidir: a identidade do eixo não depende do idioma
    // de quem olha, e chave instável faz o React remontar a lista e perder estado.
    const { container } = render(
      <ProgressiveState
        eixos={[
          { id: "engine", rotulo: "Mesmo texto", estado: "ready", rotuloDoEstado: "x" },
          { id: "analytics", rotulo: "Mesmo texto", estado: "failed", rotuloDoEstado: "y" },
        ]}
      />,
    );
    expect(container.querySelectorAll("dt")).toHaveLength(2);
  });

  it("ProgressiveState não agrega: cada eixo aparece inteiro, sem total", () => {
    const { container } = render(
      <ProgressiveState
        eixos={[
          { id: "engine", rotulo: "Engine", estado: "ready", rotuloDoEstado: "Pronto" },
          { id: "analytics", rotulo: "Analytics", estado: "withheld", rotuloDoEstado: "Retido" },
          { id: "export", rotulo: "Export", estado: "unknown", rotuloDoEstado: "Desconhecido" },
          { id: "final_result", rotulo: "Resultado", estado: "pending", rotuloDoEstado: "Aguardando" },
        ]}
      />,
    );
    expect(container.querySelectorAll("dt")).toHaveLength(4);
    // Nenhum percentual, em lugar nenhum. Um `withheld` não é "metade de ready".
    expect(container.textContent).not.toMatch(/\d+\s*%/);
    expect(container.querySelector("progress")).toBeNull();
  });

  it("ActionRequired SEM operação não oferece botão — informa e não age", () => {
    render(
      <ActionRequiredSemOperacao
        titulo="Confirmar interpretação"
        explicacao="e"
        rotuloDoEstado="Ação necessária"
        motivo="A operação ainda não está disponível"
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("A operação ainda não está disponível")).toBeInTheDocument();
    // `status`, não `alert`: nada quebrou.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("ConfirmDestructive só habilita com correspondência EXATA", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDestructive
        titulo="Excluir"
        consequencias={<p>consequências</p>}
        rotuloDoCampo="Digite o nome"
        nomeExigido="Produção"
        acao={(h) => <button disabled={!h}>Excluir</button>}
      />,
    );
    const campo = screen.getByLabelText("Digite o nome");
    const botao = screen.getByRole("button", { name: "Excluir" });
    expect(botao).toBeDisabled();

    // Nenhuma dessas "quase certas" pode passar: cada gentileza transforma a barreira em enfeite.
    for (const quase of ["Produ", "produção", "Produção ", " Produção", "Producao", "PRODUÇÃO"]) {
      await user.clear(campo);
      await user.type(campo, quase);
      expect(botao, `"${quase}" habilitou a ação destrutiva`).toBeDisabled();
    }

    await user.clear(campo);
    await user.type(campo, "Produção");
    expect(botao).toBeEnabled();
  });

  it("ConfirmDestructive descreve as consequências para a assistiva", () => {
    render(
      <ConfirmDestructive
        titulo="Excluir"
        consequencias={<p>isto não pode ser desfeito</p>}
        rotuloDoCampo="Nome"
        nomeExigido="X"
        acao={(h) => <button disabled={!h}>Excluir</button>}
      />,
    );
    const dialogo = screen.getByRole("alertdialog");
    const descrito = dialogo.getAttribute("aria-describedby");
    expect(descrito).toBeTruthy();
    expect(document.getElementById(descrito!)).toHaveTextContent("isto não pode ser desfeito");
  });

  it("DataTable renderiza a MESMA informação nas duas formas — nada some no mobile", () => {
    const { container } = render(
      <DataTable
        legenda="Registros recebidos"
        colunas={[
          { chave: "id", rotulo: "Identificador", celula: (l: { id: string; n: string }) => l.id },
          { chave: "n", rotulo: "Registros", celula: (l: { id: string; n: string }) => l.n, numerica: true },
        ]}
        linhas={[{ id: "abc", n: "1.234" }]}
        chaveDaLinha={(l) => l.id}
      />,
    );
    // Cabeçalho da tabela e rótulo da lista empilhada: os dois rótulos aparecem nas duas formas.
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("dt")).toHaveLength(2);
    expect(screen.getAllByText("Registros")).toHaveLength(2);
    // No modo empilhado o valor NÃO fica órfão: cada `dd` tem o seu `dt`.
    expect(container.querySelectorAll("dd")).toHaveLength(2);
    expect(container.querySelector("caption")).toHaveTextContent("Registros recebidos");
  });

  it("ComparisonRow QUEBRADA não mostra delta — não há variação a afirmar", () => {
    const { container } = render(
      <ComparisonRowQuebrada
        rotulo="Indicador"
        antes="10"
        depois="12"
        base="vs. execução anterior"
        motivo="mudou o vocabulário de indicadores"
      />,
    );
    // Os dois valores continuam visíveis; o que some é a afirmação de variação.
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("12");
    expect(container.textContent).not.toContain("+2");
    expect(container.textContent).toContain("mudou o vocabulário de indicadores");
  });

  it("ComparisonRow declara SEMPRE a base — delta sem base é anedota", () => {
    render(<ComparisonRow rotulo="I" antes="10" depois="12" base="vs. execução anterior" delta="+2" />);
    expect(screen.getByText("vs. execução anterior")).toBeInTheDocument();
  });

  it("ComparisonRow trata ausência como ausência, nunca como zero", () => {
    const { container } = render(
      <ComparisonRow rotulo="I" antes={null} depois="12" base="b" delta={null} />,
    );
    expect(container.textContent).toContain("—");
    expect(container.textContent).not.toMatch(/(^|[^\d])0([^\d]|$)/);
  });

  it("Toolbar com secundárias e SEM menu explode — ação que some foi perdida", () => {
    expect(() =>
      render(<Toolbar primaria={<button>p</button>} secundarias={[<button key="s">s</button>]} />),
    ).toThrow(/desapareceriam/);
    expect(() =>
      render(
        <Toolbar
          primaria={<button>p</button>}
          secundarias={[<button key="s">s</button>]}
          menuSecundarias={<button>menu</button>}
        />,
      ),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// A DÍVIDA: os equivalentes LEGADOS continuam vivos, e não podem crescer
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M13 · o legado de `shared/` é dívida congelada", () => {
  // `shared/states/*` e `shared/feedback/ConfirmDialog` fazem o trabalho destes patterns hoje, com
  // cor literal e sem as garantias acima. Migrá-los seria mexer em 15 consumidores, o que esta
  // missão não faz — mas deixá-los sem trava permitiria que a próxima tela nascesse no vocabulário
  // errado, e aí seriam 16.
  //
  // A partir daqui, o canônico é `src/design/patterns/`. O legado só pode ENCOLHER.
  const CONGELADO: Readonly<Record<string, number>> = {
    "shared/states/ErrorState": 7,
    "shared/states/EmptyState": 4,
    "shared/states/SkeletonState": 2,
    "shared/feedback/ConfirmDialog": 2,
  };

  it("nenhum equivalente legado ganhou consumidor novo", () => {
    const SRC = resolve(__dirname, "../..");

    const arquivos: string[] = [];
    const varrer = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = resolve(d, e);
        if (statSync(p).isDirectory()) varrer(p);
        else if ([".ts", ".tsx"].includes(extname(p))) arquivos.push(p);
      }
    };
    varrer(SRC);

    const cresceram: string[] = [];
    for (const [modulo, teto] of Object.entries(CONGELADO)) {
      const n = arquivos.filter(
        (a) =>
          // O arquivo legado não conta como consumidor de si mesmo...
          !a.includes(`${modulo.split("/").pop()}.tsx`) &&
          // ...e ESTE arquivo também não: ele cita os caminhos na própria declaração da dívida,
          // e contar a si mesmo faria o gate acusar um consumidor que não existe.
          !a.endsWith("patterns.test.tsx") &&
          readFileSync(a, "utf-8").includes(modulo),
      ).length;
      if (n > teto) cresceram.push(`${modulo}: ${teto} → ${n}`);
    }
    expect(
      cresceram,
      "um equivalente legado ganhou consumidor. O canônico agora é `src/design/patterns/` — " +
        "tela nova nascendo no vocabulário antigo é a dívida crescendo em silêncio.",
    ).toEqual([]);
  });
});
