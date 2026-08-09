// Cápsula visual. Container, NÃO semântica.
//
// ## O que este primitive deliberadamente NÃO sabe
//
// Ele não conhece `ready`, `partial`, `withheld`, `running` nem qualquer outro estado. Mapear
// estado para aparência é trabalho do componente de produto (M11), e é lá que a regra do segundo
// canal (V6) se prova — com ícone e rótulo, não só com cor.
//
// Se este arquivo passasse a conhecer estado, o vocabulário de estado nasceria em dois lugares:
// aqui e no componente de domínio. É exatamente o defeito que o critério 17 de UI COMPLETE existe
// para impedir.
//
// As variantes abaixo são de ÊNFASE VISUAL, não de significado. `neutro` é o default porque V5
// diz que cor semântica é reservada: se todo chip for colorido, nenhum é sinal.

import { cn } from "@/lib/utils";

const ENFASE = {
  neutro: "bg-muted text-muted-foreground border-border",
  contorno: "bg-transparent text-foreground border-border",
  solido: "bg-secondary text-secondary-foreground border-transparent",
} as const;

export type EnfaseDoChip = keyof typeof ENFASE;

export function Chip({
  enfase = "neutro",
  className,
  children,
  ...resto
}: { enfase?: EnfaseDoChip } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
        // Não encolher o conteúdo: rótulo cortado no meio é pior que chip largo, e PT-BR chega a
        // ~30% mais comprido que EN.
        "whitespace-nowrap",
        ENFASE[enfase],
        className,
      )}
      {...resto}
    >
      {children}
    </span>
  );
}
