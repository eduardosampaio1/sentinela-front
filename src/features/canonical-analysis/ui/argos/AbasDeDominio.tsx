// As abas de domínio do Diagnóstico — dentro da ROTA, nunca em rota nova.
//
// ## Por que query string e não rota
//
// As rotas do produto estão congeladas. `?dominio=semantic` põe o estado de navegação na URL — o
// link continua compartilhável, o botão voltar do navegador continua funcionando e o refresh não
// perde o lugar — sem criar caminho novo que ninguém decidiu criar.
//
// **A ausência do parâmetro é a Visão geral.** Isso é deliberado: todo link para `/argos` que já
// existe por aí abre exatamente onde abria antes. Nenhum deep link salvo muda de destino.
//
// ## São LINKS, não `role="tab"`
//
// A tentação era usar o padrão ARIA de abas. Seria mentira: `role="tab"` promete troca de painel
// sem sair do lugar, e aqui a URL muda de verdade. Link com `aria-current="page"` descreve o que
// acontece — e é o mesmo padrão que a navegação entre as duas visões já usa nesta casa.

// `PARAM_DOMINIO` e `dominioDaUrl` MUDARAM de arquivo, para `dominiosDoArgos.ts`. O lint reclamou
// que um arquivo exportando componente e constante quebra o fast refresh, e ele estava certo por um
// motivo melhor que o dele: lógica pura em arquivo de componente é lógica que ninguém testa sem
// montar árvore de React.

import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Domain } from "@/lib/v1/contract/public-v3.types";
import { DOMINIOS, PARAM_DOMINIO, dominioDaUrl } from "../../result/dominiosDoArgos";

export function AbasDeDominio({
  contagens,
  semDominio,
}: {
  /** Quantos itens cada domínio recebeu. Vem do agrupamento, não é contado aqui. */
  readonly contagens: Readonly<Record<Domain, number>>;
  /** Quantos ficaram sem domínio declarado. Zero esconde a aba; qualquer número a mostra. */
  readonly semDominio: number;
}) {
  const { t } = useLanguage();
  const { pathname, search } = useLocation();
  const atual = dominioDaUrl(search);

  const item = (chave: Domain | null, rotulo: string, contagem: number | null) => {
    const ativo = atual === chave;
    const destino = chave === null ? pathname : `${pathname}?${PARAM_DOMINIO}=${chave}`;
    return (
      <li key={chave ?? "geral"}>
        <Link
          to={destino}
          aria-current={ativo ? "page" : undefined}
          // `min-h-11` porque alvo de toque abaixo de 44px reprovou nesta casa antes.
          className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs font-medium uppercase tracking-wide transition-colors ${
            ativo
              ? "border-[hsl(var(--ds-accent-ink))] bg-accent/10 text-[hsl(var(--ds-accent-ink))]"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>{rotulo}</span>
          {/* A contagem é DADO: quantos números o documento colocou naquele domínio. Ela existe
              para que uma aba vazia se anuncie ANTES do clique, em vez de premiar a curiosidade
              com uma tela em branco. */}
          {contagem !== null ? (
            <span className="tabular-nums opacity-60" aria-hidden="true">
              {contagem}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={t("canonicalAnalysis.argos.domainsNavLabel")}>
      <ul className="flex flex-wrap gap-2">
        {item(null, t("canonicalAnalysis.argos.overview"), null)}
        {DOMINIOS.map((d) =>
          item(d, t(`canonicalAnalysis.argos.dimension.${d}`), contagens[d]),
        )}
      </ul>
      {/* Os sem-domínio NÃO viram uma quinta aba: seriam um domínio que o produtor não declarou.
          Eles vivem na Visão geral, e esta linha é o que impede a tela de somar menos números do
          que o documento traz sem ninguém notar. */}
      {semDominio > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("canonicalAnalysis.argos.withoutDomain", { n: semDominio })}
        </p>
      ) : null}
    </nav>
  );
}
