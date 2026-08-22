// O tradutor do navegador não pode mexer na árvore do React.
//
// ## O defeito que este arquivo trava
//
// Medido em homologação, com print: o Chrome ofereceu traduzir inglês→português, e a tela morreu
// com `Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be
// inserted is not a child of this node.` — o error boundary pegou, mas o usuário perdeu a página
// e só recuperou dando reload.
//
// O tradutor substitui nós de texto por conta própria. O React, na renderização seguinte, procura
// um nó que deixou de existir. É defeito conhecido da combinação, e não tem conserto do lado do
// React: quem tem de recuar é o tradutor.
//
// ## Por que um teste sobre o HTML, e não sobre um componente
//
// A proteção é uma linha do documento, não código de aplicação. Nenhum teste de componente a
// alcança — e uma linha do `index.html` some num merge sem ninguém notar, porque nada a lê.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const HTML = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");

describe("o tradutor do navegador não derruba a tela", () => {
  it("o documento declara `notranslate` para o Google", () => {
    // O nome e o valor são o contrato do Chrome; um `content` diferente não desliga nada.
    expect(
      /<meta\s+name=["']google["']\s+content=["']notranslate["']\s*\/?>/i.test(HTML),
      "sem esta linha o Chrome traduz a árvore sob o React e a tela quebra em `insertBefore`",
    ).toBe(true);
  });

  it("o `lang` inicial existe — é dele que o navegador parte", () => {
    // `LanguageContext` atualiza `document.documentElement.lang` em runtime. O valor inicial
    // ainda importa: é o que o navegador lê antes de o React montar, e é o que decide se ele
    // chega a OFERECER tradução na primeira pintura.
    const m = HTML.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    expect(m, "o documento não declara `lang`").not.toBeNull();
    expect(String(m?.[1] ?? "").trim().length).toBeGreaterThan(0);
  });
});
