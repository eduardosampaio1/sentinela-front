// As PORTAS do Diagnóstico, na barra — dentro da ROTA, nunca em rota nova.
//
// ## Mesmo mecanismo do `?dominio=`, e isso é a decisão, não a preguiça
//
// A emenda ao T4 autorizou criar o pattern `Tabs` e cobrou de volta o que a aba não dá: deep
// link, refresh e histórico. Ao abrir a implementação, o mecanismo já existia e **os três preços
// foram medidos no navegador**: `?dominio=economic` abria na porta certa, sobrevivia ao refresh e
// o botão voltar retornava. Então a autorização ficou registrada como concedida e NÃO usada, e
// esta barra reusa o que já provou.
//
// ## São LINKS, não `role="tab"`
//
// A razão está escrita em `AbasDeDominio.tsx` e vale igual aqui: `role="tab"` promete troca de
// painel **sem sair do lugar**, e aqui a URL muda de verdade. Link com `aria-current="page"`
// descreve o que acontece. O gate `two-view-gates` §F6·15 continua proibindo o contrário, e a
// árvore renderizada é conferida por teste próprio — um `role="tab"` que chegasse por biblioteca
// passaria pelo gate de texto e morreria lá.
//
// ## O que a barra NÃO faz
//
// Não conta, não ordena e não esconde porta vazia. A contagem chega pronta do agrupamento, a
// ordem é a declarada em `PORTAS`, e uma porta sem itens **aparece com zero** — para se anunciar
// ANTES do clique, em vez de premiar a curiosidade com uma tela em branco.

import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { PARAM_PORTA, PORTAS, portaDaUrl, type Porta } from "../../result/portasDoArgos";

export function AbasDePorta({
  contagens,
  semPorta,
}: {
  /** Quantos itens cada porta recebeu. Vem do agrupamento — nada é contado aqui. */
  readonly contagens: Readonly<Record<Porta, number>>;
  /** Quantos ficaram sem porta declarada. Zero esconde a linha; qualquer número a mostra. */
  readonly semPorta: number;
}) {
  const { t } = useLanguage();
  const { pathname, search } = useLocation();
  const atual = portaDaUrl(search);

  const item = (chave: Porta | null, rotulo: string, contagem: number | null) => {
    const ativo = atual === chave;
    // A Visão geral é a AUSÊNCIA do parâmetro. Todo link para `/argos` que já existe abre
    // exatamente onde abria antes.
    const destino = chave === null ? pathname : `${pathname}?${PARAM_PORTA}=${chave}`;
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
          {/* A contagem é DADO: quantas saídas o documento colocou naquela porta. */}
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
        {PORTAS.map((p) => item(p, t(`canonicalAnalysis.argos.portas.${p}`), contagens[p]))}
      </ul>
      {/* Os sem-porta NÃO viram uma quarta aba: seriam uma porta que ninguém declarou. Eles
          vivem na Visão geral, e esta linha é o que impede a tela de mostrar menos saídas do que
          o documento traz sem ninguém notar. */}
      {semPorta > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("canonicalAnalysis.argos.portas.semPorta", { n: semPorta })}
        </p>
      ) : null}
    </nav>
  );
}
