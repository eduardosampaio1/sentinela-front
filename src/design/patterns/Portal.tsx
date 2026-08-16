// PORTAL — o arquétipo de atravessar a fronteira de sessão.
//
// ## Uma porta não deve parecer o produto
//
// Sem sinais vitais, sem números, sem navegação lateral. **Uma ação primária e uma saída.** Tudo
// o que não for isso compete com a única coisa que a pessoa veio fazer, e uma porta com seis
// escolhas é uma pessoa parada no batente.
//
// ## O aviso vem ANTES do redirecionamento
//
// Este é o defeito que a validação encontrou no produto real: quem clicava para entrar era
// levado a um provedor externo sem nenhum aviso, e um erro de configuração no meio do caminho
// virava uma tela em branco de outro domínio. A pessoa não tem como saber se aquilo é parte do
// fluxo ou se quebrou.
//
// `aviso` existe para dizer, antes do clique, que haverá uma saída e um retorno. Sumir da tela
// sem avisar é o momento exato em que as pessoas acham que o produto quebrou.
//
// ## As seis rotas de acesso são esta mesma moldura
//
// Entrar, cadastrar, recuperar, redefinir, o retorno do provedor e a sessão expirada trocam só
// título, texto e ação. Seis molduras diferentes seriam seis lugares para a marca divergir.

import type { ReactNode } from "react";

export function Portal({
  marca,
  titulo,
  explicacao,
  aviso,
  children,
  saida,
}: {
  marca: string;
  titulo: string;
  /** Por que esta tela existe, do ponto de vista de quem chegou nela. */
  explicacao?: string;
  /** O que vai acontecer ao agir. Fica ANTES do painel de ação, nunca depois. */
  aviso?: string;
  /** A ação primária e o que a acompanha. */
  children: ReactNode;
  /** A saída — o caminho de quem não consegue completar a ação primária. */
  saida?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-md gap-5">
        <div
          data-revelar
          className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 bg-primary" />
          {marca}
        </div>

        <h1 data-revelar className="text-center text-2xl font-semibold tracking-tight text-foreground">
          {titulo}
        </h1>

        {explicacao && (
          <p data-revelar className="mx-auto max-w-[34ch] text-center text-sm text-muted-foreground">
            {explicacao}
          </p>
        )}

        {aviso && (
          <p
            data-revelar
            className="rounded-lg border border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground"
          >
            {aviso}
          </p>
        )}

        <div data-revelar className="grid gap-4 rounded-xl border border-border bg-card p-6">
          {children}
        </div>

        {saida && <div data-revelar className="text-center text-sm text-muted-foreground">{saida}</div>}
      </div>
    </div>
  );
}

/** Separador entre dois caminhos de acesso igualmente válidos. */
export function OuEntao({ rotulo }: { rotulo: string }) {
  return (
    <div
      className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-border" />
      {rotulo}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
