// Moldura de um bloco: mesma borda, mesmo fundo, mesmo espaçamento.
//
// Promovida na M10 (era `Cartao`). O nome mudou porque T1 é explícito: **painel, não cartão**. A
// hierarquia vem de régua e alinhamento (V1), e a separação é borda — não sombra.

import type { JSX } from "react";

/**
 * O elemento é escolha do chamador, e o padrão continua `li`.
 *
 * O painel nasceu para as grades de analytics, onde ele é sempre um item de uma lista de painéis —
 * daí `li` ser o padrão e os seis consumidores existentes não mudarem nada.
 *
 * O editor de mapeamento quebrou essa premissa: ele é UM formulário, não um item entre irmãos. Um
 * `li` solto renderiza o marcador de lista órfão (bolinha à esquerda, visível na captura que
 * pegou o defeito) e, pior que o borrão, anuncia "lista, 1 item" em volta de um formulário.
 *
 * A alternativa era copiar as classes da moldura para dentro do editor. Ela foi recusada: seria
 * exatamente o defeito que o `index` destes primitives descreve — dois vocabulários para o mesmo
 * papel, e a próxima mudança de borda pegando um e esquecendo o outro.
 */
export function Panel({
  titulo,
  como = "li",
  children,
}: {
  titulo: string;
  como?: "li" | "section";
  children: React.ReactNode;
}) {
  const Elemento = como as keyof JSX.IntrinsicElements;
  return (
    <Elemento className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {children}
    </Elemento>
  );
}
