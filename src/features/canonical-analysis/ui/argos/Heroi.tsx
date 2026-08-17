// O protagonista da Visão geral.
//
// ## O que ele conserta
//
// A tela abria com dezoito números do mesmo tamanho, na mesma cor. O `behavior_score` — a saída
// número 1 do catálogo congelado, o resumo do comportamento — aparecia como uma linha entre as
// outras. Quem abria o laudo não tinha onde pousar o olho primeiro.
//
// Um número muito maior que os outros é hierarquia por TIPOGRAFIA, não por decoração: nada aqui
// depende de cor, sombra ou brilho, e a informação não muda — só o peso com que ela é dita.
//
// ## O que ele NÃO tem, e por que a ausência é a decisão certa
//
// **Sem medidor com faixa esperada.** O protótipo tinha um bullet com a faixa do "esperado" e a
// marca do período anterior. Nenhum dos dois é publicado: não há faixa esperada em contrato
// nenhum, e o `analysis-result-v3` não tem campo de comparação. Desenhar a régua e inventar a
// marca transformaria julgamento meu em dado do produtor.
//
// **Sem vão de delta.** A tentação era mostrar um espaço hachurado dizendo "sem comparação". Mas
// hachura é para o que ESTÁ ausente, e comparação não é um campo ausente deste documento — é um
// conceito que ele não tem. Um vão prometeria que algum dia um número aparece ali, e não vai.
//
// **Sem herói substituto.** Se `behavior_score` não veio, não há herói. Promover outro escore ao
// posto trocaria silenciosamente qual número a tela apresenta como resumo — e ninguém saberia
// que a manchete mudou de assunto.

import { useLanguage } from "@/contexts/LanguageContext";
import type { PublicScore } from "@/lib/v1/contract/public-v3.types";
import {
  apresentacaoDaMedicao,
  coberturaEscrita,
  escalaEscrita,
  motivoRelevante,
  unidadeInforma,
  valorEscrito,
} from "../../result/medicaoV3";

// `ID_DO_HEROI` MUDOU para `catalogoArgos.ts`.
//
// O cadeado da jornada canônica proíbe o literal do id neste arquivo — ele está na lista de
// "indicador analítico inventado", escrita quando o nome não existia em contrato nenhum. O catálogo
// é o lugar certo por dois motivos: é onde os ids publicados moram, e é o único arquivo isento
// daquele cadeado, com a isenção justificada e guardada contra orfandade.

export function Heroi({ escore, rotulo }: { readonly escore: PublicScore; readonly rotulo: string }) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const m = escore.measurement;
  const valor = valorEscrito(m, locale);
  const apresentacao = apresentacaoDaMedicao(m);
  const cobertura = coberturaEscrita(m.data_coverage, locale);
  const escala = escalaEscrita(m.scale, locale);

  return (
    <section
      data-revelar
      data-heroi="true"
      aria-labelledby="argos-heroi"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h3
        id="argos-heroi"
        className="text-xs font-semibold uppercase tracking-widest text-accent-ink"
      >
        {rotulo}
      </h3>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        {valor !== null ? (
          // `tabular-nums` e peso médio: número grande em peso pesado vira cartaz. O tamanho já
          // carrega a hierarquia, e a fonte de largura fixa é o que faz dígito parecer medida.
          <span className="text-6xl font-medium leading-none tabular-nums tracking-tight">
            {valor}
          </span>
        ) : (
          // Sem valor, o ESTADO ocupa o lugar do número, no tamanho do texto — nunca um zero
          // grande, nunca um travessão do tamanho de um número.
          <span className="text-lg font-medium text-muted-foreground" data-sem-valor="true">
            {t(`canonicalAnalysis.argos.availability.${m.availability}`)}
          </span>
        )}
        {valor !== null && unidadeInforma(m.unit, m.scale) ? (
          <span className="pb-2 text-sm text-muted-foreground">{m.unit}</span>
        ) : null}
      </div>

      {/* Um valor parcial apresentado como completo é pior que ausência, porque ninguém desconfia
          dele. A ressalva vem junto do número, não numa nota de pé. */}
      {apresentacao === "ressalvada" ? (
        <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
          {t(`canonicalAnalysis.argos.availability.${m.availability}`)}
        </p>
      ) : null}
      {motivoRelevante(m.reason) ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t(`canonicalAnalysis.argos.reason.${m.reason}`)}
        </p>
      ) : null}

      {/* Os fatos do próprio número, na régua pequena: o herói não é isento de dizer de onde veio. */}
      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {cobertura !== null ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.coverage")}:</dt>
            <dd className="tabular-nums">{cobertura}</dd>
          </div>
        ) : null}
        {escala !== null ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.scale")}:</dt>
            <dd>{escala}</dd>
          </div>
        ) : null}
        {escore.composite_of && escore.composite_of.length > 0 ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.compositeOf")}:</dt>
            <dd>{escore.composite_of.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
