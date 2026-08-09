// Empilhamento com ritmo do sistema. Layout, nunca conteúdo.
//
// Existe para que espaçamento entre irmãos venha de uma escala curta e não de uma decisão por
// tela. A escala é a do Tailwind, que resolve nos tokens canônicos — nenhum valor nasce aqui.

import { cn } from "@/lib/utils";

/** Degraus permitidos. Escala curta de propósito: "quase igual" vira ruído visual. */
const ESPACO = { xs: "gap-1", sm: "gap-2", md: "gap-3", lg: "gap-4", xl: "gap-6" } as const;

export type EspacoDaPilha = keyof typeof ESPACO;

export function Stack({
  direcao = "vertical",
  espaco = "md",
  alinhamento,
  className,
  children,
  ...resto
}: {
  direcao?: "vertical" | "horizontal";
  espaco?: EspacoDaPilha;
  alinhamento?: "inicio" | "centro" | "fim" | "base";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex",
        direcao === "vertical" ? "flex-col" : "flex-row",
        ESPACO[espaco],
        alinhamento === "inicio" && "items-start",
        alinhamento === "centro" && "items-center",
        alinhamento === "fim" && "items-end",
        alinhamento === "base" && "items-baseline",
        className,
      )}
      {...resto}
    >
      {children}
    </div>
  );
}
