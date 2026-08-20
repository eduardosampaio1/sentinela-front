// NAV-01 — os cinco casos do contrato de §16, mais o que impede a paleta de mentir.
//
// O caso que mais importa é o último: **nenhum item aponta para âncora que não existe**. Uma
// paleta que oferece um destino morto é pior que nenhuma — ela promete alcance e entrega nada, e o
// erro só aparece no clique.

import { useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PaletaDeComandos } from "./PaletaDeComandos";

/** Uma visão de mentira com as MESMAS âncoras que as de verdade usam. */
function Visao() {
  const raiz = useRef<HTMLDivElement>(null);
  return (
    <div ref={raiz}>
      <PaletaDeComandos raiz={raiz} />
      <section aria-labelledby="argos-intents">
        <h3 id="argos-intents">Intenções</h3>
      </section>
      <section aria-labelledby="anl-procedencia">
        <h2 id="anl-procedencia">Procedência e divulgação</h2>
      </section>
      {/* Título vazio: não pode virar item. */}
      <h3 id="argos-vazio" />
      {/* Dentro da raiz, mas FORA dos prefixos de região: não é região da análise. */}
      <h2 id="outra-coisa">Rodapé institucional</h2>
    </div>
  );
}

/** A visão MAIS o shell em volta. O heading do shell tem prefixo de região e está FORA da raiz. */
function ComShell() {
  return (
    <div>
      <h2 id="argos-do-shell">Cabeçalho global</h2>
      <Visao />
    </div>
  );
}

function montar(Arvore: () => JSX.Element = Visao) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Arvore />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const gatilho = () => screen.getByRole("button", { name: /buscar nesta|search this/i });

describe("NAV-01 · paleta de comandos", () => {
  it("o gatilho é VISÍVEL — atalho de teclado sozinho não é descoberto", () => {
    montar();
    expect(gatilho()).toBeInTheDocument();
  });

  it("abre por ⌘K, e o campo recebe o foco", async () => {
    const u = userEvent.setup();
    montar();
    await u.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("indexa as regiões que ESTÃO na árvore, e só elas", async () => {
    const u = userEvent.setup();
    montar();
    await u.click(gatilho());
    const lista = screen.getByRole("listbox");
    const itens = within(lista).getAllByRole("option").map((o) => o.textContent ?? "");
    expect(itens.some((t) => t.includes("Intenções"))).toBe(true);
    expect(itens.some((t) => t.includes("Procedência"))).toBe(true);
    // O `<h3 id="argos-vazio">` sem texto não virou item.
    expect(itens.filter((t) => t.trim() === "").length).toBe(0);
  });

  it("Esc fecha e o foco VOLTA para o gatilho", async () => {
    const u = userEvent.setup();
    montar();
    await u.click(gatilho());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(gatilho()).toHaveFocus();
  });

  it("sem resultado, DIZ O QUE FAZER — nunca lista vazia muda", async () => {
    const u = userEvent.setup();
    montar();
    await u.click(gatilho());
    await u.keyboard("zzzzzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/nada com esse termo|nothing matches/i)).toBeInTheDocument();
  });

  // O caso que estava aqui antes verificava que todo item da lista tinha um heading
  // correspondente. Ele NÃO PODIA FALHAR: os itens são derivados dos headings, então a asserção
  // era a própria construção dita de novo. O que pode falhar é o RECORTE — e é o que vale testar.
  it("o recorte tem dentes: fora dos prefixos e fora da raiz NÃO entram", async () => {
    const u = userEvent.setup();
    montar(ComShell);
    await u.click(gatilho());
    const itens = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((o) => (o.firstElementChild?.textContent ?? "").trim());

    // As duas regiões de verdade entraram.
    expect(itens).toContain("Intenções");
    expect(itens).toContain("Procedência e divulgação");

    // `#outra-coisa` está DENTRO da raiz e fora dos prefixos: não é região de análise.
    expect(itens).not.toContain("Rodapé institucional");

    // `#argos-do-shell` tem prefixo de região e está FORA da raiz. Se a varredura subisse para o
    // `document`, o cabeçalho global viraria "região desta análise" — e a paleta passaria a
    // oferecer como conteúdo do laudo algo que é cromo da aplicação.
    expect(itens).not.toContain("Cabeçalho global");
  });
});
