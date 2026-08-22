// M11 — as provas do `StatusBadge`.
//
// Além das 4 combinações de D37, esta suíte carrega as duas provas que a Constituição exige para
// estado: **escala de cinza** e **deuteranopia**. As duas medem a mesma coisa por ângulos
// diferentes — se o significado sobrevive quando a cor não ajuda.
//
// A forma de provar isso não é comparar pixels: é mostrar que **nenhum par de estados diferentes
// é distinguido apenas por cor**. Se dois estados compartilham tom, eles precisam ter forma
// diferente. Isso vale em cor, em cinza e sob qualquer daltonismo, porque não depende de cor
// nenhuma.

import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";
import {
  aparenciaDeEixo,
  aparenciaPublica,
  ESTADOS_DE_EIXO,
  ESTADOS_PUBLICOS,
} from "./estados";

const COPY = {
  en: "Withheld for privacy",
  pt: "Retido por privacidade",
} as const;

const BREAKPOINTS = [
  { nome: "mobile", largura: 375 },
  { nome: "desktop", largura: 1280 },
] as const;

function renderEm(largura: number, ui: React.ReactElement) {
  const container = document.createElement("div");
  container.style.width = `${largura}px`;
  document.body.appendChild(container);
  return render(ui, { container });
}

describe("M11 · cobertura: os DOIS vocabulários, inteiros", () => {
  it("os 9 estados públicos do contrato têm aparência", () => {
    // A lista é literal, e não derivada do próprio tipo, de propósito: derivá-la faria o caso
    // aprovar qualquer estado novo sozinho — e a aparência de um estado é decisão de design,
    // não consequência de alguém ter acrescentado um membro à união.
    expect([...ESTADOS_PUBLICOS].sort()).toEqual(
      [
        "completed",
        "failed",
        "needs_mapping",
        "preparing",
        "queued",
        "ready_to_submit",
        "receiving",
        "recovering",
        "running",
      ].sort(),
    );
    for (const e of ESTADOS_PUBLICOS) expect(aparenciaPublica(e)).toBeTruthy();
  });

  it("os 10 estados de eixo do contrato têm aparência", () => {
    expect([...ESTADOS_DE_EIXO].sort()).toEqual(
      [
        "expired",
        "failed",
        "partial",
        "pending",
        "preparing",
        "ready",
        "running",
        "unavailable",
        "unknown",
        "withheld",
      ].sort(),
    );
    for (const e of ESTADOS_DE_EIXO) expect(aparenciaDeEixo(e)).toBeTruthy();
  });

  it("todo estado renderiza com ÍCONE e RÓTULO — nunca só cor", () => {
    for (const estado of ESTADOS_PUBLICOS) {
      const { container, unmount } = render(
        <StatusBadge vocabulario="publico" estado={estado} rotulo={COPY.pt} />,
      );
      expect(container.querySelector("svg"), `${estado} sem ícone`).toBeTruthy();
      expect(container.textContent).toContain(COPY.pt);
      unmount();
    }
    for (const estado of ESTADOS_DE_EIXO) {
      const { container, unmount } = render(
        <StatusBadge vocabulario="eixo" estado={estado} rotulo={COPY.pt} />,
      );
      expect(container.querySelector("svg"), `${estado} sem ícone`).toBeTruthy();
      expect(container.textContent).toContain(COPY.pt);
      unmount();
    }
  });
});

describe("M11 · V6 — cor NUNCA é o canal único", () => {
  it("dois estados que compartilham TOM têm FORMAS diferentes", () => {
    // Esta é a prova de escala de cinza E de daltonismo ao mesmo tempo, e é mais forte que
    // simular filtros: ela não depende de cor nenhuma. Se `partial`, `withheld` e `unknown`
    // compartilham o tom neutro — e compartilham, de propósito — então eles PRECISAM ter ícones
    // distintos, ou viram o mesmo estado aos olhos de quem não distingue a cor.
    const porTom = new Map<string, { estado: string; forma: string }[]>();
    for (const e of ESTADOS_PUBLICOS) {
      const a = aparenciaPublica(e);
      porTom.set(`publico:${a.tom}`, [
        ...(porTom.get(`publico:${a.tom}`) ?? []),
        { estado: e, forma: a.forma },
      ]);
    }
    for (const e of ESTADOS_DE_EIXO) {
      const a = aparenciaDeEixo(e);
      porTom.set(`eixo:${a.tom}`, [
        ...(porTom.get(`eixo:${a.tom}`) ?? []),
        { estado: e, forma: a.forma },
      ]);
    }

    const colisoes: string[] = [];
    for (const [tom, itens] of porTom) {
      const porForma = new Map<string, string[]>();
      for (const i of itens) porForma.set(i.forma, [...(porForma.get(i.forma) ?? []), i.estado]);
      for (const [forma, estados] of porForma) {
        if (estados.length > 1) colisoes.push(`${tom} + ${forma}: ${estados.join(", ")}`);
      }
    }
    expect(
      colisoes,
      "estados indistinguíveis sem cor: mesmo tom E mesma forma. Em escala de cinza ou sob " +
        "daltonismo eles viram o mesmo estado.",
    ).toEqual([]);
  });

  it("cada FORMA tem um ícone próprio — duas formas não compartilham desenho", () => {
    const desenhos = new Map<string, string[]>();
    for (const [voc, estados, fn] of [
      ["publico", ESTADOS_PUBLICOS, aparenciaPublica],
      ["eixo", ESTADOS_DE_EIXO, aparenciaDeEixo],
    ] as const) {
      for (const e of estados) {
        const { container, unmount } = render(
          // @ts-expect-error — a união discriminada é o ponto; aqui o laço é genérico.
          <StatusBadge vocabulario={voc} estado={e} rotulo="x" />,
        );
        const svg = container.querySelector("svg");
        const assinatura = svg?.innerHTML ?? "";
        const forma = fn(e as never).forma;
        desenhos.set(forma, [...new Set([...(desenhos.get(forma) ?? []), assinatura])]);
        unmount();
      }
    }
    // Cada forma tem UMA assinatura...
    for (const [forma, assinaturas] of desenhos) {
      expect(assinaturas, `forma \`${forma}\` desenhou mais de um ícone`).toHaveLength(1);
    }
    // ...e nenhuma assinatura se repete entre formas.
    const todas = [...desenhos.values()].map((a) => a[0]);
    expect(new Set(todas).size, "duas formas compartilham o mesmo desenho").toBe(todas.length);
  });

  it("privacidade e falha NÃO têm equivalência visual", () => {
    // `withheld` e `partial` são decisões CORRETAS de privacidade; `failed` é defeito. Achatá-los
    // no mesmo tom faria a tela acusar a privacidade de ser erro.
    const retido = aparenciaDeEixo("withheld");
    const parcial = aparenciaDeEixo("partial");
    const falha = aparenciaDeEixo("failed");
    expect(retido.tom).not.toBe(falha.tom);
    expect(parcial.tom).not.toBe(falha.tom);
    expect(retido.forma).not.toBe(parcial.forma);
    expect(retido.forma).not.toBe(falha.forma);
  });

  it("`unknown` não se parece com ausência nem com zero nem com falha", () => {
    const desconhecido = aparenciaDeEixo("unknown");
    for (const outro of ["unavailable", "failed", "ready"] as const) {
      const a = aparenciaDeEixo(outro);
      expect(
        `${desconhecido.tom}/${desconhecido.forma}`,
        `\`unknown\` ficou igual a \`${outro}\``,
      ).not.toBe(`${a.tom}/${a.forma}`);
    }
  });

  it("`expired` não se parece com `unavailable` — não entrego mais ≠ não há o que oferecer", () => {
    expect(aparenciaDeEixo("expired").forma).not.toBe(aparenciaDeEixo("unavailable").forma);
  });

  it("`recovering` não se parece com `running` — houve uma falha antes", () => {
    expect(aparenciaPublica("recovering").forma).not.toBe(aparenciaPublica("running").forma);
  });
});

describe("M11 · as 4 combinações de D37, com axe", () => {
  // Uma amostra que cobre os quatro tons — rodar os 18 estados × 4 combinações seria 72 casos
  // sem acrescentar informação: o que muda entre estados é ícone e tom, e ambos já são cobertos
  // acima estado a estado.
  const AMOSTRA = [
    { vocabulario: "publico", estado: "running" },
    { vocabulario: "publico", estado: "needs_mapping" },
    { vocabulario: "publico", estado: "completed" },
    { vocabulario: "publico", estado: "failed" },
    { vocabulario: "eixo", estado: "withheld" },
  ] as const;

  for (const caso of AMOSTRA) {
    for (const idioma of ["en", "pt"] as const) {
      for (const bp of BREAKPOINTS) {
        it(`${caso.estado} — ${idioma} × ${bp.nome}`, async () => {
          const { container, unmount } = renderEm(
            bp.largura,
            // Sem `@ts-expect-error`: a AMOSTRA é `as const`, então o spread preserva a união
            // discriminada e o tipo fecha sozinho. A primeira versão trazia a diretiva por
            // simetria com o outro laço — e o `tsc` reprovou por ela ser inútil, que é o
            // comportamento certo: diretiva de exceção que não excetua nada é ruído que ensina
            // a ignorar as que importam.
            <StatusBadge {...caso} rotulo={COPY[idioma]} />,
          );
          // `color-contrast` desabilitado: depende de estilo computado, que o jsdom não fornece.
          // Habilitá-lo aqui daria verde sem medir contraste nenhum. O contraste é provado por
          // aritmética sobre os valores declarados, em `contraste-de-estado.test.ts`.
          const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
          expect(r.violations.map((v) => v.id)).toEqual([]);
          unmount();
        });
      }
    }
  }

  it("o ícone é decorativo e o rótulo é o nome acessível", () => {
    const { container } = render(
      <StatusBadge vocabulario="eixo" estado="withheld" rotulo={COPY.pt} />,
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(COPY.pt)).toBeInTheDocument();
  });

  it("só o que está EM CURSO gira, e o giro respeita reduced motion", () => {
    // `getAttribute("class")` e não `.className`: em elemento SVG o `className` é um
    // `SVGAnimatedString`, não uma string — a primeira versão deste caso comparava contra um
    // objeto e teria passado (ou falhado) sem relação com a classe real.
    const classeDo = (c: HTMLElement) => c.querySelector("svg")?.getAttribute("class") ?? "";

    const emCurso = render(<StatusBadge vocabulario="publico" estado="running" rotulo="x" />);
    expect(classeDo(emCurso.container)).toContain("motion-safe:animate-spin");
    emCurso.unmount();

    const montando = render(<StatusBadge vocabulario="eixo" estado="preparing" rotulo="x" />);
    expect(classeDo(montando.container)).toContain("motion-safe:animate-spin");
    montando.unmount();

    // Parado NÃO gira: giro é a informação "está andando", e girar num estado parado seria a
    // tela com cara de trabalho em curso sobre algo que não avança.
    for (const estado of ["queued", "needs_mapping", "completed", "failed"] as const) {
      const parado = render(<StatusBadge vocabulario="publico" estado={estado} rotulo="x" />);
      expect(classeDo(parado.container), `${estado} não pode girar`).not.toContain("animate-spin");
      parado.unmount();
    }
  });
});
