// Tipografia do sistema. Papel semântico, nunca tamanho literal.
//
// A1 da Constituição: **numerais tabulares em todo dado quantitativo**, na mesma família de
// texto. Família mono fica reservada a identificador, hash e código — onde é literal e copiável.
// Por isso `numerico` existe como variante em vez de um `<span className="font-mono">` solto:
// número que muda de largura entre estados destrói a leitura de uma série.

import { cn } from "@/lib/utils";

const TOM = {
  primario: "text-foreground",
  secundario: "text-foreground/85",
  discreto: "text-muted-foreground",
} as const;

const PAPEL = {
  corpo: "text-sm",
  rotulo: "text-xs",
  // 620, o peso do titulo de cartao no prototipo (`.card .hd h3`). `font-medium` (500) deixava
  // o titulo leve demais para separar-se do corpo sem depender de cor.
  titulo: "text-sm font-[620]",
  // 660, o peso do titulo de PORTA no prototipo (`.door > .t h3`).
  destaque: "text-base font-[660]",
  /**
   * O rótulo MICRO do protótipo: mono, caixa alta, 11px, entrelinha aberta.
   *
   * Isto MUDA a regra escrita no cabeçalho deste arquivo — "família mono fica reservada a
   * identificador, hash e código". O protótipo aprovado usa mono também no rótulo de seção e de
   * cartão, e a decisão de owner de 2026-08-17 fez o protótipo virar o sistema.
   *
   * A razão dele é boa, e é diferente da razão do `literal`: em caixa alta e pequeno, a largura
   * fixa da mono dá ritmo ao rótulo e o separa do corpo sem precisar de cor. O `letter-spacing` é
   * o que impede caixa alta pequena de virar borrão.
   */
  micro: "font-mono text-[0.6875rem] uppercase tracking-[0.14em]",
  /**
   * O protagonista. Tamanho fluido porque 104px não cabe em 375px de viewport.
   *
   * Peso MÉDIO, não pesado: em 104px o peso já vem do tamanho, e negrito viraria cartaz. E
   * `tabular-nums` porque é dado — dígito que muda de largura destrói a leitura.
   */
  /**
   * MONO, e isto foi correção depois de comparar com o protótipo BUSCADO — não com a memória
   * dele. O protótipo declara `.heroNum .v { font-family: var(--mono) }`, e o número maior da
   * tela estava saindo na fonte de texto. Numa fonte de máquina de escrever o dígito tem
   * largura fixa e desenho técnico: é o que faz o número parecer medida, e não manchete.
   *
   * Peso 500 e entrelinha .85 já batiam. O `tracking` foi de -0.04 para -0.05em, que é o
   * literal do protótipo — em 104px, um centésimo de em são pixels visíveis.
   */
  /**
   * Escala reduzida de `clamp(3.25rem,9vw,6.5rem)` — 52 a 104px — para 40 a 64px.
   *
   * O owner: *"esse número tá gigante, o 'Dentro do esperado' está desproporcional"*. A razão é
   * o INTERVALO: 104px contra 20px do veredito é um salto de 5:1, e salto assim não é
   * hierarquia — é ruptura. O olho não lê os dois como partes da mesma resposta.
   *
   * Em 64px contra 20px o passo cai para 3,2:1, que é um degrau de escala tipográfica: o número
   * segue sendo o maior elemento sem deixar o resto do cartão parecer legenda.
   *
   * Os 104px vinham do protótipo, e lá eles cabiam num cartão maior, com mais coisa em volta.
   * Copiar o valor sem copiar o contexto foi o mesmo erro da proporção `1.35fr`.
   */
  heroi:
    "font-mono text-[clamp(2.5rem,5.5vw,4rem)] font-medium leading-[0.9] tracking-[-0.04em] tabular-nums",
} as const;

export function Text({
  papel = "corpo",
  tom = "primario",
  numerico = false,
  literal = false,
  className,
  as: Tag = "span",
  children,
  ...resto
}: {
  papel?: keyof typeof PAPEL;
  tom?: keyof typeof TOM;
  /** Dado quantitativo: liga numerais tabulares (A1). */
  numerico?: boolean;
  /** Identificador, hash, código — onde a família mono carrega significado. */
  literal?: boolean;
  as?: "span" | "p" | "dt" | "dd" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        PAPEL[papel],
        TOM[tom],
        numerico && "tabular-nums",
        literal && "font-mono",
        className,
      )}
      {...resto}
    >
      {children}
    </Tag>
  );
}
