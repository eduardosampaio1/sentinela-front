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
