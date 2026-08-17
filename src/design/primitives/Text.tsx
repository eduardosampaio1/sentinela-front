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
  titulo: "text-sm font-medium",
  destaque: "text-base font-medium",
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
  heroi: "text-[clamp(3.25rem,9vw,6.5rem)] font-medium leading-[0.85] tracking-[-0.04em] tabular-nums",
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
