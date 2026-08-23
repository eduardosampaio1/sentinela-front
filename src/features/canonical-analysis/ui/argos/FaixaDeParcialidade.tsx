// A FAIXA DE PARCIALIDADE — a declaração do produtor sobre o documento inteiro.
//
// ## Por que os códigos voltaram a ser VISÍVEIS
//
// Eles estavam atrás de um gatilho, e a razão escrita era boa: `indicator_not_measured` é nome
// de campo do contrato, e como linha de prosa sob o título ele fazia o único aviso da tela
// falar linguagem de máquina.
//
// A objeção era ao REGISTRO, não à presença. Um código cru numa linha de texto pede para ser
// lido como frase; o mesmo código como **chip monoespaçado à direita** se lê como etiqueta — e
// etiqueta ninguém tenta interpretar como frase. É assim que a V4 os mostra, e é o que resolve
// as duas coisas: quem investiga vê o código sem clicar, e quem não investiga não tropeça nele.
//
// O que NÃO mudou: a frase humana continua sendo o que explica, e vem primeiro.
//
// ## Por que a confiança mora aqui
//
// `global_confidence` responde a pergunta que a faixa levanta. A faixa diz *"parte não foi
// medida"*; a pergunta seguinte é *"então quanto vale o que sobrou?"*. Deixá-la solta no meio
// dos KPIs, como um número entre seis, era responder sem que ninguém tivesse ouvido a pergunta.
//
// Ela é lida do documento, nunca calculada aqui: é `scores[]` publicado pelo produtor.
//
// ## O NOME dela vem de fora
//
// A primeira versão cunhou `headerConfidence` — «Confiabilidade da análise». Era uma segunda
// palavra para uma medida que o produto JÁ nomeia: `global_confidence` tem rótulo no catálogo
// («Global confidence») e aparece com ele no cartão de KPI, dois blocos abaixo. A mesma medida
// com dois nomes na mesma tela é o defeito que a M11 existe para impedir — e quem apontou foi
// o gate de orçamento de tradução, porque a palavra inventada estourava 1,32× o inglês.
//
// Agora o rótulo chega pronto de quem sabe nomear medidas (`rotuloDe`, na `ArgosView`).

import type { Partiality, PublicScore } from "@/lib/v1/contract/public-v3.types";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarraDeFracao } from "@/design/primitives";
import { valorEscrito } from "../../result/medicaoV3";

export interface FaixaDeParcialidadeProps {
  readonly partiality: Partiality;
  /** `global_confidence`, quando o documento o publica. `null` quando não. */
  readonly confianca: PublicScore | null;
  /** O rótulo humano da confiança, do catálogo. Esta camada não nomeia medida. */
  readonly rotuloDaConfianca: string;
  readonly locale: string;
}

export function FaixaDeParcialidade({
  partiality,
  confianca,
  rotuloDaConfianca,
  locale,
}: FaixaDeParcialidadeProps) {
  const { t } = useLanguage();
  if (partiality.complete) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm lg:flex-row lg:items-start lg:justify-between"
    >
      <div className="min-w-0">
        <p className="font-medium">{t("canonicalAnalysis.argos.partialTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("canonicalAnalysis.argos.partialBody")}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        {partiality.reasons.length > 0 ? (
          <ul
            aria-label={t("canonicalAnalysis.argos.partialCodes")}
            className="flex flex-wrap items-center gap-1.5"
          >
            {partiality.reasons.map((r) => (
              <li
                key={r}
                className="rounded border border-border/70 bg-background/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {r}
              </li>
            ))}
          </ul>
        ) : null}
        <ConfiancaGlobal confianca={confianca} rotulo={rotuloDaConfianca} locale={locale} />
      </div>
    </div>
  );
}

/**
 * A confiança global, com barra — e a AUSÊNCIA dita quando ela não vem.
 *
 * O produto tem 37 saídas e várias chegam `unavailable` numa corrida qualquer. Um bloco que
 * simplesmente não renderiza quando falta ensina que a análise não tem confiança declarada,
 * quando o que houve foi o produtor não a ter medido — duas coisas diferentes, e a #24 diz que
 * ausência não é zero.
 */
function ConfiancaGlobal({
  confianca,
  rotulo,
  locale,
}: {
  readonly confianca: PublicScore | null;
  readonly rotulo: string;
  readonly locale: string;
}) {
  const { t } = useLanguage();
  if (!confianca) return null;

  const m = confianca.measurement;
  const escrito = valorEscrito(m, locale);

  if (m.availability !== "available" || m.value === null || escrito === null) {
    return (
      <p className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="text-muted-foreground">
          {t("canonicalAnalysis.argos.notMeasuredShort")}
        </span>
      </p>
    );
  }

  // A barra só é honesta quando a escala é uma razão de 0 a 1. Para qualquer outra o número
  // sai SEM barra: desenhar 89,23 como 89% de uma trilha afirmaria um máximo de 100 que o
  // produtor não declarou (`scale.maximum` é nulo neste documento). O grampo de 0..1 mora na
  // primitiva, com a geometria — ver o cabeçalho de `BarraDeFracao`.
  const ehRazao = m.scale.kind === "ratio_unit";

  return (
    <p className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-semibold tabular-nums">{escrito}</span>
      {ehRazao ? <BarraDeFracao fracao={m.value} className="w-20" /> : null}
    </p>
  );
}

export default FaixaDeParcialidade;
