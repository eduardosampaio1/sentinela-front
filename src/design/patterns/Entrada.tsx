// ENTRADA — o arquétipo de compor algo novo.
//
// ## Por que não é um assistente de três passos
//
// Porque as escolhas aqui não são sequenciais: elas se afetam. Um assistente esconde isso — a
// pessoa decide no passo 2 algo que apaga metade do que ela pediu no passo 1, e só descobre na
// saída, quando já não dá para voltar sem refazer.
//
// Uma composição mostra o efeito enquanto a escolha é feita. O painel lateral não é um resumo do
// que foi preenchido: é **o que será produzido**, e ele muda ao vivo.
//
// ## A linha apagada é o ponto
//
// Quando uma escolha remove uma medida do resultado, a linha correspondente apaga na hora, no
// lugar em que a pessoa está olhando. É a tela ensinando a regra antes de a pessoa descobrir na
// saída — que foi exatamente a crítica que o protótipo recebeu e a razão de este padrão existir.
//
// ## Nada é enviado antes da confirmação
//
// Dito na tela, não só verdadeiro no código. Uma tela que compõe algo caro precisa dizer que
// compor não é executar, senão a pessoa hesita em experimentar.

import type { ReactNode } from "react";

export function Composicao({
  campos,
  painel,
}: {
  campos: ReactNode;
  painel: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div>{campos}</div>
      <aside className="lg:sticky lg:top-20 lg:self-start">{painel}</aside>
    </div>
  );
}

/** Um campo com rótulo VISÍVEL e dica persistente — nunca rótulo dentro do placeholder. */
export function Campo({
  id,
  rotulo,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  /** Fica sempre visível. Dica que só aparece no erro chega tarde demais. */
  dica?: string;
  children: ReactNode;
}) {
  return (
    <div data-revelar className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {rotulo}
      </label>
      {children}
      {dica && (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  );
}

export interface PecaProduzida {
  chave: string;
  rotulo: string;
  /** Quantidade, já formatada. `null` quando esta escolha a removeu do resultado. */
  quantidade: string | null;
}

/**
 * O painel do que será produzido.
 *
 * Peça removida NÃO some da lista: ela fica, apagada, com o traço no lugar do número. Sumir
 * esconderia que existe uma medida que poderia estar ali — e é justamente isso que a pessoa
 * precisa saber para decidir se quer escolher uma referência.
 */
export function PainelDoQueSeraProduzido({
  titulo,
  pecas,
  rodape,
}: {
  titulo: string;
  pecas: readonly PecaProduzida[];
  rodape?: ReactNode;
}) {
  return (
    <div data-revelar className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</p>

      <ul className="grid gap-2 text-sm">
        {pecas.map((p) => {
          const removida = p.quantidade === null;
          return (
            <li key={p.chave} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 flex-none rounded-full ${
                  removida ? "bg-muted-foreground" : "bg-success"
                }`}
              />
              <span className={removida ? "text-muted-foreground" : "text-foreground"}>
                {p.rotulo}
              </span>
              <span
                className={`ml-auto tabular text-xs ${
                  removida ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {p.quantidade ?? "—"}
              </span>
            </li>
          );
        })}
      </ul>

      {rodape && <div className="border-t border-border pt-4">{rodape}</div>}
    </div>
  );
}
