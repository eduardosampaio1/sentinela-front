// M13 — barra de ações que preserva PRIORIDADE quando o espaço encolhe.
//
// A regra responsiva das ações não é "esconder o que não cabe": é *primária visível, resto em
// menu*. Por isso a API separa a ação primária das secundárias em vez de receber uma lista e
// deixar o layout decidir — lista deixaria a prioridade emergir da ordem, e ordem se perde no
// primeiro refactor.

import { Stack } from "@/design/primitives";
import { cn } from "@/lib/utils";

export function Toolbar({
  primaria,
  secundarias = [],
  menuSecundarias,
  className,
}: {
  /** Sempre visível, em qualquer largura. */
  primaria: React.ReactNode;
  /** Visíveis a partir do tablet. */
  secundarias?: readonly React.ReactNode[];
  /** O mesmo conjunto, colapsado, para o mobile. Obrigatório quando há secundárias: sem ele, elas
   *  simplesmente sumiriam no telefone — que é a perda de informação que a regra proíbe. */
  menuSecundarias?: React.ReactNode;
  className?: string;
}) {
  if (secundarias.length > 0 && menuSecundarias === undefined) {
    throw new Error(
      "Toolbar: há ações secundárias sem `menuSecundarias`. No mobile elas desapareceriam, e " +
        "ação que some não foi despriorizada — foi perdida.",
    );
  }
  return (
    <Stack
      direcao="horizontal"
      espaco="sm"
      alinhamento="centro"
      className={cn("flex-wrap justify-end", className)}
    >
      {secundarias.length > 0 && (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            {secundarias.map((a, i) => (
              <span key={i}>{a}</span>
            ))}
          </div>
          <div className="sm:hidden">{menuSecundarias}</div>
        </>
      )}
      {primaria}
    </Stack>
  );
}
