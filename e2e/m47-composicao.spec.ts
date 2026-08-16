// M47 — as páginas decompostas renderizam TODAS as suas seções.
//
// ## O buraco que este gate fecha
//
// A landing e a página do AION eram monólitos de ~1180 linhas e **nenhum teste afirmava o conteúdo
// delas**. Passavam na matriz transversal (M45) porque a matriz pergunta outra coisa: se a
// superfície alcança estado terminal, se o axe está limpo, se não estoura a largura. Uma âncora
// só, no herói, respondia por tudo.
//
// Enquanto eram um arquivo, isso quase não importava: ninguém apaga uma seção sem ver. Depois da
// decomposição, esquecer um `<Section />` na composição é um acidente de UMA LINHA — e a página
// continuaria alcançando estado terminal, com axe limpo e sem estourar largura. Verde, e faltando
// um terço do argumento.
//
// A decomposição criou o risco; este gate é a contrapartida dela. Sem ele, a M47 teria trocado um
// monólito ilegível por um mosaico que se desmonta em silêncio.
//
// ## Por que âncoras de TÍTULO, e não contagem de componentes
//
// Contar filhos do `<main>` mediria a árvore que eu escrevi. Título é o que a pessoa lê: se o
// título da seção de preço não está na tela, a seção de preço não está na tela — não importa qual
// componente deixou de ser chamado.

import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

interface Pagina {
  readonly rota: string;
  readonly nome: string;
  /** Um trecho por seção, na ORDEM em que a página os apresenta. */
  readonly secoes: readonly { readonly rotulo: string; readonly texto: RegExp }[];
  /** A esteira/faixa que não tem título próprio, e por isso precisa de âncora à parte. */
  readonly semTitulo: readonly { readonly rotulo: string; readonly texto: RegExp }[];
}

const PAGINAS: readonly Pagina[] = [
  {
    rota: "/",
    nome: "landing",
    secoes: [
      { rotulo: "herói", texto: /Do you know if it's working/ },
      { rotulo: "problema", texto: /What you can't see is what hurts/ },
      { rotulo: "plataforma", texto: /Six signals that turn AI behavior/ },
      { rotulo: "como funciona", texto: /From raw data to decision in minutes/ },
      { rotulo: "resultados", texto: /What changes when you have visibility/ },
      { rotulo: "preço", texto: /Free while we validate together/ },
      { rotulo: "chamada final", texto: /Stop guessing what/ },
    ],
    // `ContextStrip` é a esteira de modelos: não tem título, e some sem deixar buraco visível
    // num gate que só olha `h1`/`h2`.
    semTitulo: [{ rotulo: "esteira de modelos", texto: /Claude 3\.5|Mistral Large/ }],
  },
  {
    rota: "/aion",
    nome: "aion",
    secoes: [
      { rotulo: "herói", texto: /The proxy that thinks/ },
      { rotulo: "problema", texto: /Flying blind/ },
      { rotulo: "módulos", texto: /Three modules/ },
      { rotulo: "nemos", texto: /Gets smarter/ },
      { rotulo: "integração", texto: /Change one line/ },
      { rotulo: "agnóstico", texto: /Works with any LLM/ },
      { rotulo: "observabilidade", texto: /See everything/ },
      { rotulo: "contato", texto: /POC-ready/ },
    ],
    // `MetricsSection` não usa `h2`; sem esta âncora ela poderia sumir da composição sem reprovar.
    semTitulo: [{ rotulo: "métricas", texto: /\d+%|\d+x/ }],
  },
];

for (const p of PAGINAS) {
  test(`${p.nome}: todas as seções estão na composição`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto(p.rota);
    const main = page.locator("main");
    await expect(main).toBeVisible({ timeout: 20_000 });

    for (const s of [...p.secoes, ...p.semTitulo]) {
      await expect(
        main.getByText(s.texto).first(),
        `${p.nome}: a seção "${s.rotulo}" não está renderizada — ela saiu da composição?`,
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test(`${p.nome}: as seções aparecem na ORDEM da página`, async ({ page }) => {
    // A ordem é argumento, não estilo: problema antes de solução, solução antes de preço. Uma
    // composição reordenada por engano passaria no caso acima sem que ninguém notasse.
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto(p.rota);
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    const titulos = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main h1, main h2")).map((h) =>
        (h.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    );

    // Piso do instrumento: se o seletor parar de casar, `titulos` vem vazio e o laço abaixo é
    // sempre verde — a forma exata de vacuidade que a M45.8 pegou no gate de cobertura.
    expect(titulos.length, `${p.nome}: nenhum título encontrado — o seletor quebrou?`).toBe(
      p.secoes.length,
    );

    let anterior = -1;
    for (const s of p.secoes) {
      const i = titulos.findIndex((t) => s.texto.test(t));
      expect(i, `${p.nome}: "${s.rotulo}" não está entre os títulos`).toBeGreaterThan(-1);
      expect(i, `${p.nome}: "${s.rotulo}" saiu de ordem`).toBeGreaterThan(anterior);
      anterior = i;
    }
  });
}
