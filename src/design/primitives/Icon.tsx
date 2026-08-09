// Moldura de ícone com tamanho do sistema.
//
// V6 diz que estado nunca depende só de cor — o ícone é um dos canais que sustentam essa regra.
// Por isso este primitive EXIGE decidir se o ícone carrega significado ou é decoração: um ícone
// informativo sem nome acessível é informação que o leitor de tela não recebe, e um ícone
// decorativo anunciado é ruído. Não há default: quem usa escolhe.

import { cn } from "@/lib/utils";

const TAMANHO = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

type Comum = { tamanho?: keyof typeof TAMANHO; className?: string; children: React.ReactNode };

/** Ícone que CARREGA significado: precisa de nome acessível. */
export function IconeInformativo({ rotulo, tamanho = "md", className, children }: Comum & { rotulo: string }) {
  return (
    <span role="img" aria-label={rotulo} className={cn("inline-flex shrink-0", TAMANHO[tamanho], className)}>
      {children}
    </span>
  );
}

/** Ícone que REFORÇA um texto já presente: some para a tecnologia assistiva. */
export function IconeDecorativo({ tamanho = "md", className, children }: Comum) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0", TAMANHO[tamanho], className)}>
      {children}
    </span>
  );
}
