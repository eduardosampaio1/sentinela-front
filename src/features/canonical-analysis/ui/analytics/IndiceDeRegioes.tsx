// M31 — o índice das regiões desta página.
//
// ## O problema medido
//
// RES-01 tem sete regiões e, medida no navegador, 2902px no desktop, 3733 no tablet e 4369 no
// mobile. Sem nenhum atalho, a única forma de descobrir que existe "Por que confiar" ou
// "Comparado com a anterior" era rolar até topá-las. Duas heurísticas cobravam isso ao mesmo
// tempo: a 7 de Nielsen (nenhum acelerador para quem já conhece a tela) e a 4ª pergunta do trunk
// test de Krug — *"quais são minhas opções neste nível?"*.
//
// ## Por que não é feature nova
//
// Não introduz dado, não busca nada, não decide nada. É navegação sobre a estrutura que já
// existe: cada região já era uma `<section aria-labelledby>` com `<h2 id>`, e o índice aponta para
// esses mesmos ids. Nenhuma âncora é inventada aqui.
//
// ## O rótulo do índice é o rótulo da seção
//
// Nenhuma string nova de região. O item do índice recebe o MESMO texto que titula a seção, da
// mesma chave de i18n. Um índice que chamasse a região por outro nome que o título dela seria a
// violação da consistência (Nielsen 4) que ele deveria estar resolvendo.
//
// ## Só entra o que está na tela
//
// A lista chega pronta de quem compõe a página, e lá ela é montada a partir das mesmas condições
// que renderizam cada região. Um índice com item para uma seção ausente mandaria a pessoa a uma
// âncora morta — e âncora morta é pior que ausência de índice.

import { useLanguage } from "@/contexts/LanguageContext";

export interface RegiaoIndexada {
  /** O `id` do `<h2>` da seção. O salto vai para o TÍTULO, não para o topo da caixa. */
  ancora: string;
  rotulo: string;
}

export function IndiceDeRegioes({ regioes }: { regioes: readonly RegiaoIndexada[] }) {
  const { t } = useLanguage();
  // Com uma região só não há entre o que navegar, e o índice seria ruído com cara de estrutura.
  if (regioes.length < 2) return null;

  return (
    <nav aria-label={t("canonicalAnalysis.result.regionIndexLabel")} className="border-b border-border pb-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {t("canonicalAnalysis.result.regionIndexLabel")}
      </p>
      {/* Lista, não linha de botões: é sumário, e leitor de tela anuncia "lista com N itens" —
          que é exatamente a resposta à pergunta "quais são minhas opções neste nível?". */}
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {regioes.map((r) => (
          <li key={r.ancora}>
            {/* Âncora de verdade, não `scrollTo`: o histórico do navegador continua funcionando,
                o link é copiável e abre onde deve. `focus-visible` herda o anel do tema. */}
            {/* `inline-block py-1.5` dá ~32px de alvo. Como texto puro de 14px o link tinha ~20px
                de altura — abaixo dos 24×24 que o WCAG 2.2 AA exige em 2.5.8, e é no mobile, onde
                a página tem 4432px, que o índice mais serve. O axe não mede tamanho de alvo; esta
                veio da revisão de design, não da ferramenta. */}
            <a
              href={`#${r.ancora}`}
              className="inline-block py-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground"
            >
              {r.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
