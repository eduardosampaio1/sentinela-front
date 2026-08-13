// F3 — a visão ARGOS. Fonte ÚNICA: `analysis-result-v3`.
//
// ## O que esta tela não faz
//
// Não chama `/analytics`. Não lê o bloco analítico do v2. Não calcula escore, faixa de risco,
// Drift nem delta. Não normaliza escala, não converte moeda, não soma projeção. Tudo o que ela
// mostra foi decidido pelo produtor; o que sobra aqui é agrupar, ordenar quando o contrato
// autoriza, e **dizer o que o produtor disse** sobre cada medição.
//
// ## Família omitida ≠ família vazia
//
// A distinção mais importante da tela, e a mais fácil de perder. Campo AUSENTE significa que a
// capacidade não foi produzida neste documento; `[]` significa que ela existe, rodou e não
// encontrou item. Materializar a ausente como seção vazia faria a tela afirmar "procuramos e não
// há" — afirmação que ninguém fez.
//
// Por isso a seção só existe quando a família foi produzida, e quando ela veio vazia a tela diz
// isso com palavra própria.
//
// ## Sem queda para o v1
//
// O documento é pedido com `?result_schema_version=3`. Análise antiga sem v3 recebe
// indisponibilidade explícita — nunca o v1 com cara de resultado completo, que faria dez
// famílias ausentes parecerem "o ARGOS não produziu nada".

import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import type { EstadoPublico } from "@/design/patterns/estados";
import type {
  AnalysisResultV3Document,
  PublicAlert,
  PublicIssue,
} from "@/lib/v1/contract/public-v3.types";
import { useAnalysisArgos } from "../../data/argos";
import { resolverLeituraArgos } from "../../result/adapterV3";
import { useAnalysisStatus } from "../../data/analysis";
import { familiaFoiProduzida, type FamiliaArgos } from "../../result/contratoV3";
import { descriptorDe } from "../../result/descriptors";
import { AnalysisShell } from "../AnalysisShell";
import { ProblemFeedback, problemCodeOf } from "../notices";
import { useCanonicalScope } from "../scope";
import { Indicador, Medicao } from "./Medicao";

/** Uma região da visão. O `id` é a âncora, e o título é o que o índice usaria. */
function Secao({
  id,
  titulo,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-1">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** "A capacidade rodou e não encontrou nada" — dito com palavra, não com espaço em branco. */
function Vazia() {
  const { t } = useLanguage();
  return (
    <p className="py-3 text-sm text-muted-foreground" data-familia-vazia="true">
      {t("canonicalAnalysis.argos.familyEmpty")}
    </p>
  );
}

/**
 * Renderiza a família SOMENTE se ela foi produzida.
 *
 * O `null` de saída é a diferença entre "o ARGOS não avalia risco nesta análise" e "avaliou e
 * não encontrou risco nenhum". Nenhuma seção nasce para preencher layout.
 */
function Familia<T>({
  documento,
  familia,
  id,
  titulo,
  itens,
  children,
}: {
  readonly documento: AnalysisResultV3Document;
  readonly familia: FamiliaArgos;
  readonly id: string;
  readonly titulo: string;
  readonly itens: readonly T[] | null | undefined;
  readonly children: (itens: readonly T[]) => React.ReactNode;
}) {
  if (!familiaFoiProduzida(documento, familia)) return null;
  const lista = itens ?? [];
  return (
    <Secao id={id} titulo={titulo}>
      {lista.length === 0 ? <Vazia /> : children(lista)}
    </Secao>
  );
}

/** "Esta análise não tem documento ARGOS" — e o que ainda está disponível. */
function SemDocumentoArgos() {
  const { t } = useLanguage();
  return (
    // `status`, não `alert`: é conclusão sobre disponibilidade, não falha. A casa já usa essa
    // distinção, e transformá-la em alerta ensinaria a ignorar alertas.
    <div role="status" className="space-y-2 rounded-md border border-border p-4">
      <p className="text-sm font-medium">{t("canonicalAnalysis.argos.noDocumentTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.argos.noDocumentBody")}
      </p>
    </div>
  );
}

function Achados({
  itens,
  rotuloSeveridade,
}: {
  readonly itens: readonly (PublicAlert | PublicIssue)[];
  readonly rotuloSeveridade: string;
}) {
  return (
    <ul className="space-y-2">
      {itens.map((item) => (
        <li key={item.id} className="border-b border-border/60 py-2 last:border-b-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{item.title}</span>
            {/* A severidade é DADO do produtor: nenhuma faixa é calculada aqui. */}
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              <span className="sr-only">{rotuloSeveridade}: </span>
              {item.severity}
            </span>
            <code className="text-xs text-muted-foreground">{item.code}</code>
          </div>
          {/* O `detail` do alerta NÃO é apresentado. O cadeado da jornada canônica proíbe
              `.detail` na UI — ele existe contra o detalhe cru de `problem+json`, e não sabe
              distinguir daquele campo homônimo que o v3 publica como conteúdo. Afrouxá-lo
              abriria justamente a porta que ele fecha. Lacuna declarada no DOC-CLOSE, e o
              alerta segue com título, código e severidade publicados. */}
        </li>
      ))}
    </ul>
  );
}

export function ArgosView() {
  const { t, language } = useLanguage();
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  // O status alimenta o shell — a leitura é a mesma da jornada, deduplicada pela `queryKey`.
  const status = useAnalysisStatus(scope, analysisId);
  const argos = useAnalysisArgos(scope, analysisId);

  const titulo = t("canonicalAnalysis.argos.title");

  /**
   * O rótulo de uma medida.
   *
   * O contrato **não publica rótulo humano** para os 39 outputs do catálogo. Inventar tradução
   * para todos seria adivinhar; mostrar o `id` é feio e honesto. O meio-termo já existe nesta
   * casa: `descriptorDe` conhece os ids do registro canônico e o dicionário tem o rótulo deles.
   *
   * Sem descritor, sai o `id` cru — nunca um rótulo adivinhado. É o mesmo cadeado que
   * `descriptors.ts` declara: "indicador novo no backend não aparece com rótulo adivinhado".
   */
  function rotuloDe(id: string): string {
    return descriptorDe(id) ? t(`canonicalAnalysis.result.indicator.${id}.label`) : id;
  }

  function corpo() {
    if (!scope) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.entry.workspaceMissing")}
        </p>
      );
    }
    if (argos.isLoading) {
      return <LoadingState message={t("canonicalAnalysis.argos.loading")} size="md" />;
    }
    if (argos.isError) {
      // O caso da análise histórica merece palavra PRÓPRIA.
      //
      // `result_not_available` genérico diz "não há resultado para esta análise" — e para uma
      // análise antiga isso é falso pelo lado que importa: o resultado histórico existe e
      // continua acessível; o que não existe é o documento ARGOS. A primeira versão desta tela
      // reusava a mensagem genérica, e a captura do browser é que denunciou o entendimento
      // errado que ela produzia.
      //
      // Isto é explicar disponibilidade — trabalho do Front —, não inventar dado.
      if (problemCodeOf(argos.error) === "result_not_available") {
        return <SemDocumentoArgos />;
      }
      // Qualquer outro problema é apresentado pelo código, nunca substituído por um v1 parecido.
      return (
        <ProblemFeedback
          error={argos.error}
          onRetry={() => void argos.refetch()}
          retryDisabled={argos.isFetching}
        />
      );
    }
    if (!argos.data) return null;

    const leitura = resolverLeituraArgos(argos.data);
    if (leitura.estado === "recusado") {
      // O produtor respondeu, mas não com um v3. Dizer isso é a única saída honesta: adaptar o
      // que veio seria a queda silenciosa que o contrato inteiro existe para impedir.
      return (
        <div role="alert" className="space-y-2 rounded-md border border-border p-4">
          <p className="text-sm font-medium">{t("canonicalAnalysis.argos.unavailableTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t(`canonicalAnalysis.argos.refused.${leitura.reason}`)}
          </p>
        </div>
      );
    }

    const d = leitura.documento;
    return (
      <div className="space-y-8">
        {/* Parcialidade é declaração do produtor sobre o documento inteiro. Vem primeiro porque
            é ela que explica por que o resto pode estar incompleto. */}
        {d.partiality && !d.partiality.complete ? (
          <div
            role="status"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          >
            <p className="font-medium">{t("canonicalAnalysis.argos.partialTitle")}</p>
            {d.partiality.reasons.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {d.partiality.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {d.executive_summary ? (
          <Secao id="argos-sumario" titulo={t("canonicalAnalysis.argos.executiveSummary")}>
            <p className="whitespace-pre-line py-2 text-sm">{d.executive_summary.text}</p>
          </Secao>
        ) : null}

        {/* Escores globais. `composite_of` é RESPEITADO: um composto declara as partes que o
            formam, e é isso que impede alguém somar o agregado junto delas. */}
        <Familia
          documento={d}
          familia="scores"
          id="argos-scores"
          titulo={t("canonicalAnalysis.argos.scores")}
          itens={d.scores}
        >
          {(itens) => (
            <div>
              {itens.map((s) => (
                <div key={s.measurement.id}>
                  <Medicao
                    medicao={s.measurement}
                    rotulo={rotuloDe(s.measurement.id)}
                  />
                  {s.composite_of && s.composite_of.length > 0 ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.compositeOf")}: {s.composite_of.join(", ")}
                    </p>
                  ) : null}
                  {/* A janela é obrigatória em drift, e é ela que impede dois valores de
                      análises diferentes parecerem série. Quando vem, aparece. */}
                  {s.window_kind ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.window")}: {s.window_kind}
                      {s.window_size ? ` (${s.window_size})` : ""}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        {/* As QUATRO dimensões de saúde. Não existe quinta, e o AI Health NÃO é uma delas: ele é
            escore composto e vive acima, com `composite_of` declarando estas quatro. */}
        <Familia
          documento={d}
          familia="dimensions"
          id="argos-dimensions"
          titulo={t("canonicalAnalysis.argos.dimensions")}
          itens={d.dimensions}
        >
          {(itens) => (
            <div>
              {itens.map((m) => (
                <Medicao
                  key={m.id}
                  medicao={m}
                  // As quatro dimensoes sao conjunto FECHADO do contrato — rotulo proprio e
                  // legitimo. Um id fora delas nao chega aqui sem o contrato mudar.
                  rotulo={t(`canonicalAnalysis.argos.dimension.${m.id}`)}
                />
              ))}
            </div>
          )}
        </Familia>

        <Familia
          documento={d}
          familia="indicators"
          id="argos-indicators"
          titulo={t("canonicalAnalysis.argos.indicators")}
          itens={d.indicators}
        >
          {(itens) => (
            <div>
              {itens.map((i) => (
                <Indicador
                  key={i.id}
                  indicador={i}
                  rotulo={rotuloDe(i.id)}
                />
              ))}
            </div>
          )}
        </Familia>

        {/* Intenções preservam identidade e suporte publicados. Nenhuma vira indicador
            sintético: `intent_id` é dado do tenant, não do registro canônico. */}
        <Familia
          documento={d}
          familia="intents"
          id="argos-intents"
          titulo={t("canonicalAnalysis.argos.intents")}
          itens={d.intents}
        >
          {(itens) => (
            <div>
              {itens.map((i) => (
                <div key={i.intent_id}>
                  <Medicao medicao={i.score} rotulo={i.intent_id} />
                  <p className="pb-2 text-xs text-muted-foreground">
                    {t("canonicalAnalysis.argos.support")}: {i.support}
                    {i.underrepresented
                      ? ` · ${t("canonicalAnalysis.argos.underrepresented")}`
                      : ""}
                    {i.severity ? ` · ${i.severity}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Familia>

        {/* `band` quando vier. Sem band, NENHUM threshold nasce aqui. */}
        <Familia
          documento={d}
          familia="risks"
          id="argos-risks"
          titulo={t("canonicalAnalysis.argos.risks")}
          itens={d.risks}
        >
          {(itens) => (
            <div>
              {itens.map((r) => (
                <div key={r.id}>
                  <Medicao
                    medicao={r.measurement}
                    rotulo={rotuloDe(r.id)}
                  />
                  {r.band ? (
                    <p className="pb-2 text-xs text-muted-foreground" data-band={r.band}>
                      {t("canonicalAnalysis.argos.band")}: {r.band}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        {/* Horizonte é DADO. Nada é somado, nada é convertido de moeda. */}
        <Familia
          documento={d}
          familia="projections"
          id="argos-projections"
          titulo={t("canonicalAnalysis.argos.projections")}
          itens={d.projections}
        >
          {(itens) => (
            <div>
              {itens.map((p) => (
                <div key={`${p.id}:${p.horizon}`}>
                  <Medicao
                    medicao={{ ...p.measurement, unit: p.currency ?? p.measurement.unit }}
                    // O horizonte e DADO e entra no rotulo — nunca inferido do nome do id.
                    rotulo={`${rotuloDe(p.id)} · ${p.horizon}`}
                  />
                  {p.basis ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.basis")}: {p.basis}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        <Familia
          documento={d}
          familia="recommendations"
          id="argos-recommendations"
          titulo={t("canonicalAnalysis.argos.recommendations")}
          itens={d.recommendations}
        >
          {(itens) => (
            <ul className="space-y-2">
              {itens.map((r) => (
                <li key={r.id} className="border-b border-border/60 py-2 last:border-b-0">
                  <span className="text-sm">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{r.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </Familia>

        <Familia
          documento={d}
          familia="alerts"
          id="argos-alerts"
          titulo={t("canonicalAnalysis.argos.alerts")}
          itens={d.alerts}
        >
          {(itens) => (
            <Achados itens={itens} rotuloSeveridade={t("canonicalAnalysis.argos.severity")} />
          )}
        </Familia>

        <Familia
          documento={d}
          familia="issues"
          id="argos-issues"
          titulo={t("canonicalAnalysis.argos.issues")}
          itens={d.issues}
        >
          {(itens) => (
            <Achados itens={itens} rotuloSeveridade={t("canonicalAnalysis.argos.severity")} />
          )}
        </Familia>

        <Familia
          documento={d}
          familia="evidence"
          id="argos-evidence"
          titulo={t("canonicalAnalysis.argos.evidence")}
          itens={d.evidence}
        >
          {(itens) => (
            <ul className="space-y-1">
              {itens.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-1 text-sm">
                  <span>{e.label ?? e.kind}</span>
                  <span className="tabular-nums text-muted-foreground">{e.observed_count}</span>
                </li>
              ))}
            </ul>
          )}
        </Familia>

        {/* Procedência da montagem. Não é decoração: é o que explica um output que aparece ou
            some entre duas execuções. */}
        <Secao id="argos-provenance" titulo={t("canonicalAnalysis.argos.provenance")}>
          <dl className="grid gap-x-6 gap-y-1 py-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.registryVersion")}:</dt>
              <dd>{d.indicator_registry_version}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.catalogVersion")}:</dt>
              <dd>{d.argos_catalog_version}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.records")}:</dt>
              <dd className="tabular-nums">{d.summary.record_count}</dd>
            </div>
            {d.method.currency ? (
              <div className="flex gap-1">
                <dt>{t("canonicalAnalysis.argos.currency")}:</dt>
                <dd>
                  {d.method.currency}
                  {d.method.currency_source ? ` (${d.method.currency_source})` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </Secao>
      </div>
    );
  }

  return (
    <AppShell topBarTitle={titulo}>
      <PageFrame maxWidth="lg">
        <div className="space-y-6" data-testid="argos-view">
          <AnalysisShell
            analysisId={analysisId ?? ""}
            estado={status.data?.status as EstadoPublico | undefined}
            titulo={titulo}
          />
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}

export default ArgosView;
