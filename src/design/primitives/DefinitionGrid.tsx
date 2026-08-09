// Grade de rótulo + valor. Fatos lado a lado, nunca somados nem convertidos.
//
// Promovida na M10 (era `Contagens`). O nome antigo vinha da tela que a originou; o novo descreve
// o que ela é — a Constituição pede nome do vocabulário do sistema, não da primeira tela.
//
// `<dl>` de propósito: rótulo e valor têm relação de definição, e a tecnologia assistiva a lê.
// Numerais tabulares em todo valor (A1), senão a coluna dança entre estados.

import { Text } from "./Text";

export function DefinitionGrid({
  itens,
  className,
}: {
  itens: readonly { label: string; display: string }[];
  className?: string;
}) {
  return (
    <dl className={className ?? "mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4"}>
      {itens.map((c) => (
        <div key={c.label} className="flex items-baseline justify-between gap-2">
          <Text as="dt" papel="rotulo" tom="discreto">
            {c.label}
          </Text>
          <Text as="dd" papel="rotulo" numerico className="font-medium">
            {c.display}
          </Text>
        </div>
      ))}
    </dl>
  );
}
