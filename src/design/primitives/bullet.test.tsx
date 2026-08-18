// O BULLET, e o que ele se recusa a inventar.
//
// A peça existe porque duas fatias de backend derrubaram a premissa que a recusava: o `Heroi`
// dizia *"não há faixa esperada em contrato nenhum"*, e hoje `PublicMeasurement.thresholds`
// publica os dois cortes que o motor aplica.
//
// O que se prova aqui é o que impede o desenho de virar julgamento:
//
// 1. a ZONA é derivada dos cortes publicados, nas duas direções;
// 2. valor fora da régua GRUDA na borda em vez de vazar do desenho;
// 3. sem valor, as zonas ficam e o marcador some — o vão COM referência;
// 4. o número e os cortes ficam ESCRITOS, então a leitura não depende de cor.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Bullet } from "./Bullet";
import { zonaDoValor } from "./zonaDoBullet";

describe("Bullet · a zona sai dos cortes, nas duas direções", () => {
  // O par real do motor: `THR_WARN = 75`, `THR_CRIT = 60`, e `critical < warn` = menor é pior.
  describe("menor é pior (o caso do `behavior_score`)", () => {
    const z = (v: number) => zonaDoValor(v, 75, 60);

    it("abaixo do crítico é crítico", () => {
      expect(z(0)).toBe("critico");
      expect(z(59.9)).toBe("critico");
    });

    it("entre os cortes é atenção", () => {
      expect(z(60)).toBe("atencao");
      expect(z(74.9)).toBe("atencao");
    });

    it("no warn e acima é ok", () => {
      // A fronteira pertence à zona MELHOR: `score >= warn` é o que o motor chama de OK, e um
      // bullet que pintasse 75 de amarelo contradiria o veredito do produtor no mesmo pixel.
      expect(z(75)).toBe("ok");
      expect(z(100)).toBe("ok");
    });
  });

  describe("maior é pior (custo, risco, drift)", () => {
    const z = (v: number) => zonaDoValor(v, 0.5, 0.8);

    it("acima do crítico é crítico", () => {
      expect(z(0.81)).toBe("critico");
      expect(z(1)).toBe("critico");
    });

    it("entre os cortes é atenção", () => {
      expect(z(0.51)).toBe("atencao");
      expect(z(0.8)).toBe("atencao");
    });

    it("no warn e abaixo é ok", () => {
      expect(z(0.5)).toBe("ok");
      expect(z(0)).toBe("ok");
    });
  });

  it("a direção sai da ORDEM, e trocar os cortes inverte o juízo do MESMO valor", () => {
    // O teste que pega a inversão silenciosa. `70` com `(75, 60)` é atenção; com `(60, 75)` —
    // os mesmos dois números na ordem oposta — é atenção também, mas `50` muda de crítico para
    // ok. Sem isto, uma troca no transporte passaria despercebida.
    expect(zonaDoValor(50, 75, 60)).toBe("critico");
    expect(zonaDoValor(50, 60, 75)).toBe("ok");
  });
});

describe("Bullet · o desenho não vaza, e não depende de cor", () => {
  const base = { warn: 75, critical: 60, piso: 0, teto: 100, descricao: "escore" };

  it("escreve o valor e os cortes em TEXTO", () => {
    render(<Bullet {...base} valor={80.4} rotuloDoValor="80,4" />);
    // O canal que sobrevive à escala de cinza: quem não distingue as cores lê os três números.
    expect(screen.getByText("80,4")).toBeInTheDocument();
    expect(screen.getByText("60 · 75")).toBeInTheDocument();
  });

  it("a figura tem nome — leitor de tela recebe frase, não uma pilha de divs", () => {
    render(<Bullet {...base} valor={80.4} rotuloDoValor="80,4" descricao="Behavior score 80,4 de 100, zona ok" />);
    expect(screen.getByRole("img", { name: /Behavior score 80,4 de 100/ })).toBeInTheDocument();
  });

  it("valor FORA da régua gruda na borda em vez de vazar", () => {
    const { container } = render(<Bullet {...base} valor={140} rotuloDoValor="140" />);
    const marcador = container.querySelector("span[style*='left']:last-of-type") as HTMLElement;
    expect(marcador.style.left).toBe("100%");
  });

  it("SEM valor, as zonas ficam e o marcador some", () => {
    // O vão COM referência: a tela sabe onde ficaria o bom, e não desenha um traço sem régua.
    const { container } = render(<Bullet {...base} valor={null} rotuloDoValor="—" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
    // Três faixas, nenhum marcador: o marcador tem largura fixa de 3px.
    expect(container.querySelectorAll("span[style*='left']:not([style*='opacity'])")).toHaveLength(0);
    // As faixas sao as unicas com `opacity` — o marcador nao tem. Contar por `background`
    // falhou: o jsdom serializa `background-color`, e o seletor media o proprio seletor.
    expect(container.querySelectorAll("span[style*='opacity']")).toHaveLength(3);
  });

  it("régua degenerada não quebra o desenho", () => {
    // `piso === teto` daria divisão por zero. Nenhum contrato produz isso hoje, e é justamente
    // por isso que ninguém notaria antes de a tela quebrar em produção.
    const { container } = render(
      <Bullet {...base} piso={50} teto={50} valor={50} rotuloDoValor="50" />,
    );
    expect(container.querySelector("[role='img']")).toBeInTheDocument();
    // E as posições precisam ser NÚMEROS. A primeira versão deste caso afirmava só que a
    // tela não quebrava — e a mutação que remove o guarda de divisão por zero SOBREVIVEU:
    // `0/0` dá `NaN`, `left: NaN%` é inválido e o React não reclama. Verde por não quebrar
    // é diferente de verde por estar certo.
    const posicionados = container.querySelectorAll("span[style*='left']");
    // A CONTAGEM primeiro. Sem ela o laço abaixo itera sobre zero elementos e passa por
    // vacuidade — que foi exatamente o que aconteceu: `NaN%` é inválido, o jsdom descarta a
    // propriedade, `left` some do estilo e o seletor não casa com nada. Laço vazio é sempre
    // verde, e a mutação que remove o guarda de divisão por zero sobreviveu por isso.
    expect(posicionados.length, "nenhum elemento posicionado: `left` inválido foi descartado")
      .toBeGreaterThanOrEqual(3);
    // E o MARCADOR, especificamente. As faixas sobrevivem a régua degenerada (`Infinity`
    // vira 1 no clamp), então contá-las passava com o guarda removido — só o marcador
    // recebia `NaN%` e era descartado pelo jsdom. Medir o agregado escondia o único que
    // some, que é a definição de gate que mede a coisa errada.
    expect(
      container.querySelectorAll("span[style*='left']:not([style*='opacity'])"),
      "o marcador sumiu: posição inválida numa régua degenerada",
    ).toHaveLength(1);
    for (const el of posicionados) {
      const pos = (el as HTMLElement).style.left;
      expect(pos, `posição inválida: ${pos}`).toMatch(/^[\d.]+%$/);
    }
  });
});
