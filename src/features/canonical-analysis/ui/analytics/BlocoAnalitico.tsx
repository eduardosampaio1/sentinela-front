// O bloco analítico inteiro — a composição das áreas, e o único lugar que olha `status`.
//
// Cada área é um arquivo, recebe view model pronto e não sabe de onde ele veio. Este arquivo é o
// que decide QUAL delas aparece, e ele decide por um `switch` exaustivo sobre os três estados —
// nunca por presença de campo.

import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalyticsNotes, AnalyticsView } from "../../result/adapterV2";
import { AreaDeConcentracao } from "./Concentracao";
import { AreaDeDistribuicoes } from "./Distribuicoes";
import { AreaDeMedidas } from "./Medidas";
import { AreaDeSerie } from "./Serie";
import { AnalyticsRetido } from "./Retido";

/**
 * O que o documento trouxe e esta tela não mostra. Aparece só quando há o que declarar.
 *
 * Sem isto, um bloco que a página não apresenta seria indistinguível de um bloco que a análise
 * não produziu — e a segunda leitura é a que faz alguém procurar defeito no backend.
 */
function Notas({ notas }: { notas: AnalyticsNotes }) {
  const { t } = useLanguage();
  const linhas = (
    [
      ["blocksNotPresented", notas.blocksNotPresented],
      ["measuresNotSummarized", notas.measuresNotSummarized],
      ["measuresNotAuthorized", notas.measuresNotAuthorized],
      ["unreadableBlocks", notas.unreadableBlocks],
    ] as const
  ).filter(([, quantos]) => quantos > 0);
  if (linhas.length === 0) return null;
  return (
    <section aria-labelledby="an-notas" className="space-y-1">
      <h3 id="an-notas" className="text-sm font-medium text-muted-foreground">
        {t("canonicalAnalysis.result.analytics.notesTitle")}
      </h3>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {linhas.map(([chave, quantos]) => (
          <li key={chave}>
            {/* Interpolação pelo caminho canônico. Antes era `.replace("{n}", …)` — a segunda
                via que a M14 eliminou: o placeholder `{n}` não é substituído por `interpolate()`,
                então só funcionava em quem lembrasse de fazer a troca na mão. */}
            {t(`canonicalAnalysis.result.analytics.${chave}`, { n: quantos })}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlocoAnalitico({ analytics }: { analytics: AnalyticsView }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="res-analytics" className="space-y-4">
      <div>
        <h2 id="res-analytics" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.result.analytics.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.analytics.subtitle")}
        </p>
      </div>

      {analytics.status === "withheld" ? (
        <AnalyticsRetido />
      ) : (
        <>
          {/* `partial` diz que a análise terminou e entregou MENOS. Colapsá-lo em `ready`
              esconderia a omissão; tratá-lo como erro afirmaria uma falha que não houve. */}
          {analytics.status === "partial" && (
            <p role="status" className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
              {t("canonicalAnalysis.result.analytics.partialNotice")}
            </p>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              {/* O denominador ANALÍTICO. Ele tem cartão próprio, separado da janela da Engine,
                  porque são duas contagens com definições diferentes — e no v1 elas dividiam o
                  mesmo nome, que é o defeito que a MF6.3 corrigiu. */}
              <dt className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.result.analytics.recordCount")}
              </dt>
              <dd className="mt-1 text-xl font-semibold text-foreground">
                {analytics.content.recordCountDisplay}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-sm text-muted-foreground">
                {t("canonicalAnalysis.result.analytics.lineage")}
              </dt>
              <dd className="mt-1 truncate text-xl font-semibold text-foreground">
                {analytics.lineage.snapshotContractVersion}
              </dd>
            </div>
          </dl>

          <AreaDeMedidas medidas={analytics.content.measures} />
          <AreaDeDistribuicoes
            id="an-dimensoes"
            tituloKey="canonicalAnalysis.result.analytics.dimensionsTitle"
            distribuicoes={analytics.content.dimensions}
          />
          <AreaDeDistribuicoes
            id="an-distribuicoes"
            tituloKey="canonicalAnalysis.result.analytics.distributionsTitle"
            distribuicoes={analytics.content.distributions}
          />
          <AreaDeConcentracao concentracoes={analytics.content.concentrations} />
          <AreaDeSerie series={analytics.content.series} />
          <Notas notas={analytics.content.notes} />
        </>
      )}
    </section>
  );
}
