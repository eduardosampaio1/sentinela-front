// M13 — tabela que vira lista empilhada, sem perder coluna.
//
// A regra de responsivo é literal: *o mobile nunca perde informação relevante só porque não coube;
// ele reorganiza*. Por isso este pattern não tem prop de "esconder no mobile". Ele renderiza a
// MESMA informação em duas formas — tabela acima do breakpoint, lista de pares rótulo/valor abaixo
// — e o rótulo da coluna acompanha o valor no modo empilhado, senão o número fica órfão.

// `Stack` saiu do import na M32: estava morto. Nao apareceu antes porque nada no grafo de
// typecheck alcançava este arquivo — a HOME-01 passou a importar o barrel de patterns e o erro
// herdado veio junto. Codigo inalcancavel esconde defeito.
import { Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

export interface ColunaDaTabela<L> {
  chave: string;
  /** Cabeçalho já traduzido. */
  rotulo: string;
  celula: (linha: L) => React.ReactNode;
  /** Dado quantitativo alinha à direita e usa numerais tabulares (A1). */
  numerica?: boolean;
}

export function DataTable<L>({
  colunas,
  linhas,
  chaveDaLinha,
  legenda,
  className,
}: {
  colunas: readonly ColunaDaTabela<L>[];
  linhas: readonly L[];
  chaveDaLinha: (linha: L) => string;
  /** `<caption>`: o que esta tabela lista. Obrigatório — tabela sem legenda é tabela anônima. */
  legenda: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Tabela real a partir do tablet. */}
      <table className="hidden w-full text-sm sm:table">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr className="border-b border-border">
            {colunas.map((c) => (
              <th
                key={c.chave}
                scope="col"
                className={cn(
                  "px-2 py-2 text-left text-xs font-medium text-muted-foreground",
                  c.numerica && "text-right",
                )}
              >
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chaveDaLinha(l)} className="border-b border-border/60">
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={cn("px-2 py-2", c.numerica && "text-right tabular-nums")}
                >
                  {c.celula(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empilhado no mobile: MESMAS colunas, cada valor com o seu rótulo. */}
      <ul className="space-y-3 sm:hidden">
        {linhas.map((l) => (
          <li key={chaveDaLinha(l)} className="rounded-lg border border-border bg-card p-3">
            <dl className="space-y-1">
              {colunas.map((c) => (
                <div key={c.chave} className="flex items-baseline justify-between gap-3">
                  <Text as="dt" papel="rotulo" tom="discreto">
                    {c.rotulo}
                  </Text>
                  <Text as="dd" papel="rotulo" numerico={c.numerica} className="text-right">
                    {c.celula(l)}
                  </Text>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
