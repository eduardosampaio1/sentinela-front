// A BARRA DE FRAÇÃO — uma razão 0..1 desenhada como comprimento.
//
// ## Por que ela é primitiva, e não três divs no componente que precisa dela
//
// O cadeado `backend-first-result` proíbe `Math.*` em qualquer componente de
// `canonical-analysis/ui`. A regra existe para impedir que a tela FABRIQUE número analítico, e
// ela não distingue — nem deve — «conta de desenho» de «conta de medida». Um grep que aceitasse
// `Math.min` porque desta vez é geometria seria a brecha por onde a primeira conta de verdade
// entraria.
//
// Então a geometria mora aqui, como no `Bullet` e na `ReguaDeFaixas`: o produto passa a fração
// publicada; esta camada decide pixels.
//
// ## O grampo não é conversão
//
// `Math.min/max` aqui **não transforma o dado** — o valor exibido é sempre o que o produtor
// publicou, escrito por quem chama. O grampo protege só a LARGURA: uma razão que chegasse como
// `1.4` desenharia uma barra vazando o container, e uma negativa desenharia largura negativa.
// Nenhum dos dois é um número novo na tela; são um retângulo que cabe.

export interface BarraDeFracaoProps {
  /** A razão publicada, em 0..1. Fora do intervalo, a BARRA gruda na borda — o número não muda. */
  readonly fracao: number;
  /** Largura da trilha. Classe utilitária, para quem chama decidir o espaço que tem. */
  readonly className?: string;
}

export function BarraDeFracao({ fracao, className }: BarraDeFracaoProps) {
  const largura = Math.max(0, Math.min(1, fracao));
  return (
    // `aria-hidden`: a barra é redundante por construção — quem a usa escreve o número ao lado.
    // Anunciá-la faria o leitor de tela ouvir a mesma razão duas vezes.
    <span
      aria-hidden="true"
      data-barra-de-fracao=""
      className={["block h-1.5 overflow-hidden rounded-full bg-border", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="block h-full rounded-full bg-primary"
        style={{ width: `${largura * 100}%` }}
      />
    </span>
  );
}

export default BarraDeFracao;
