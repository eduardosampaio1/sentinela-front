import { useMemo } from "react";
import { useAnalysisResult } from "@/features/canonical-analysis/data/analysis";
import { adaptAnalysisResult, type IndicatorView } from "@/features/canonical-analysis/result/adapter";
import type { LinhaHistorico } from "@/features/canonical-analysis/data/historicoView";
import type { CanonicalScope } from "@/lib/v1";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, formatRelativeTime } from "@/lib/utils";

/**
 * Comparação de duas análises — jornada CANÔNICA.
 *
 * ## As duas chamadas, e por que não são N+1
 *
 * Comparar exige os **documentos completos** das duas análises. Este painel só existe depois
 * que o usuário selecionou duas linhas e clicou em comparar: são **duas** chamadas a `/result`
 * disparadas por **uma ação**, e nunca uma chamada por linha da listagem. A listagem continua
 * custando uma requisição, e o teste que conta chamadas na `HistoryPage` continua valendo.
 *
 * ## O que a comparação não pode fazer
 *
 * * **cruzar workspaces** — as duas análises vêm da mesma listagem, que é workspace-scoped, e o
 *   Gateway autoriza cada `/result` contra a membership do token. O painel não decide isso.
 * * **transformar ausência em zero** — o delta só é calculado quando os **dois** lados estão
 *   `measured`. Faltando um, o par é exibido como incomparável, com o estado de cada lado.
 * * **inventar métrica** — o delta é a subtração de dois valores publicados. Nenhum indicador
 *   novo nasce aqui.
 * * **esconder incompatibilidade** — versões de schema ou de registro de indicadores diferentes
 *   entre os documentos aparecem em destaque. Comparar números de contratos diferentes é o erro
 *   que só o consumidor pode evitar, e ele só consegue se souber.
 */

export interface RunComparePanelProps {
  escopo: CanonicalScope;
  /** A mais ANTIGA — o delta é lido como "de A para B". */
  linhaA: LinhaHistorico;
  linhaB: LinhaHistorico;
  onClose: () => void;
}

// ─── Par comparável ───────────────────────────────────────────────────────────

type Par =
  | { id: string; rotulo: string; kind: "comparavel"; a: IndicatorView; b: IndicatorView; delta: number }
  | { id: string; rotulo: string; kind: "incomparavel"; a: IndicatorView | null; b: IndicatorView | null };

/**
 * `t` entra por parâmetro porque `parear` é função pura — não pode chamar hook.
 *
 * O descriptor canônico carrega `labelKey` (chave i18n), não `label`. O código lia
 * `descriptor.label`, que não existe: `rotulo` caía sempre no fallback e o painel exibia o **id
 * cru** do indicador, além de ordenar por ele. Saída plausível e errada — ninguém vê "está em
 * inglês técnico" como defeito.
 *
 * O erro era invisível porque `features/history` estava fora do alcance do `npm run typecheck`.
 */
function parear(a: IndicatorView[], b: IndicatorView[], t: (chave: string) => string): Par[] {
  const porId = new Map<string, { a?: IndicatorView; b?: IndicatorView }>();
  for (const ind of a) porId.set(ind.id, { ...(porId.get(ind.id) ?? {}), a: ind });
  for (const ind of b) porId.set(ind.id, { ...(porId.get(ind.id) ?? {}), b: ind });

  const pares: Par[] = [];
  for (const [id, { a: ia, b: ib }] of porId) {
    const chave = ia?.descriptor.labelKey ?? ib?.descriptor.labelKey;
    const rotulo = chave ? t(chave) : id;
    // `measured` dos DOIS lados é a condição. Um indicador `unavailable` tem `rawValue` que não
    // é medição; subtraí-lo produziria um delta que parece fato e não é.
    const medidoA = ia?.state === "measured" && ia.rawValue !== null;
    const medidoB = ib?.state === "measured" && ib.rawValue !== null;
    if (medidoA && medidoB) {
      pares.push({
        id,
        rotulo,
        kind: "comparavel",
        a: ia,
        b: ib,
        delta: (ib.rawValue as number) - (ia.rawValue as number),
      });
    } else {
      pares.push({ id, rotulo, kind: "incomparavel", a: ia ?? null, b: ib ?? null });
    }
  }
  return pares.sort((x, y) => x.rotulo.localeCompare(y.rotulo));
}

// ─── Apresentação ─────────────────────────────────────────────────────────────

const INDISPONIVEL = "—";

function Valor({ ind }: { ind: IndicatorView | null }) {
  if (!ind) {
    return (
      <span className="text-xs text-[#475569]" data-estado="ausente">
        {INDISPONIVEL}
      </span>
    );
  }
  if (ind.state !== "measured" || ind.display === null) {
    return (
      <span className="text-xs text-[#94A3B8]" data-estado={ind.state}>
        {ind.state.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-[#F1F5F9]" data-estado="measured">
      {ind.display}
      {ind.unitSuffix ?? ""}
    </span>
  );
}

function Delta({ valor }: { valor: number }) {
  const seta = valor > 0 ? "↑" : valor < 0 ? "↓" : "";
  const cor = valor > 0 ? "text-[#34D399]" : valor < 0 ? "text-[#F87171]" : "text-[#94A3B8]";
  return (
    <span className={cn("text-xs font-semibold", cor)} data-testid="delta">
      {seta} {valor > 0 ? "+" : ""}
      {Math.round(valor * 100) / 100}
    </span>
  );
}

function Cabecalho({ linha, lado }: { linha: LinhaHistorico; lado: "A" | "B" }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">
        {lado === "A" ? "Earlier" : "Later"}
      </p>
      <p className="text-sm font-medium text-[#F1F5F9] truncate">
        {linha.createdAt ? formatRelativeTime(linha.createdAt) : INDISPONIVEL}
      </p>
      {/* A linha de Engine saiu: `engine_version` esta em `nunca_publicos` do contrato
          congelado, e o cliente nunca ve Engine. Terceira superficie que o exibia, e a
          unica que nem o typecheck nem o vitest cobriam. */}
    </div>
  );
}

// ─── Painel ───────────────────────────────────────────────────────────────────

export function RunComparePanel({ escopo, linhaA, linhaB, onClose }: RunComparePanelProps) {
  const { t } = useLanguage();
  // Duas chamadas EXPLÍCITAS, ambas disparadas por esta montagem — que só acontece pela ação
  // de comparar. `habilitado` é `true` porque o painel não existe sem a intenção do usuário.
  const a = useAnalysisResult(escopo, linhaA.analysisId, true);
  const b = useAnalysisResult(escopo, linhaB.analysisId, true);

  const analise = useMemo(() => {
    if (!a.data || !b.data) return null;
    const adA = adaptAnalysisResult(a.data);
    const adB = adaptAnalysisResult(b.data);
    if (adA.status !== "supported" || adB.status !== "supported") {
      return { tipo: "nao_suportado" as const };
    }
    return {
      tipo: "ok" as const,
      pares: parear(adA.view.indicators, adB.view.indicators, t),
      // Divergência de procedência é MOSTRADA, não normalizada.
      schemaDivergente: adA.view.schemaVersion !== adB.view.schemaVersion,
      registryDivergente:
        adA.view.indicatorRegistryVersion !== adB.view.indicatorRegistryVersion,
      registryA: adA.view.indicatorRegistryVersion,
      registryB: adB.view.indicatorRegistryVersion,
    };
  }, [a.data, b.data, t]);

  const carregando = a.isPending || b.isPending;
  const falhou = Boolean(a.error || b.error);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(2,6,23,0.72)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Compare analyses"
      data-testid="compare-panel"
    >
      <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-[#0D1424] border border-[rgba(255,255,255,0.08)] p-6">
        <div className="flex items-start gap-6 mb-6">
          <Cabecalho linha={linhaA} lado="A" />
          <Cabecalho linha={linhaB} lado="B" />
          <button
            onClick={onClose}
            className="text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            aria-label="Close comparison"
          >
            Close
          </button>
        </div>

        {carregando && (
          <p className="text-sm text-[#94A3B8]" data-testid="compare-loading">
            Loading both results…
          </p>
        )}

        {!carregando && falhou && (
          <p className="text-sm text-[#F87171]" data-testid="compare-error">
            One of the results could not be loaded. Comparison is unavailable.
          </p>
        )}

        {!carregando && !falhou && analise?.tipo === "nao_suportado" && (
          <p className="text-sm text-[#FCD34D]" data-testid="compare-unsupported">
            One of the results uses a schema this build does not know how to read.
          </p>
        )}

        {!carregando && !falhou && analise?.tipo === "ok" && (
          <>
            {(analise.schemaDivergente || analise.registryDivergente) && (
              <div
                className="mb-4 px-4 py-2.5 rounded-xl bg-[rgba(252,211,77,0.06)] border border-[rgba(252,211,77,0.18)]"
                data-testid="compare-incompatibilidade"
              >
                <p className="text-xs text-[#FCD34D]">
                  These analyses were produced under different measurement contracts
                  {analise.registryDivergente
                    ? ` (indicator registry ${analise.registryA} vs ${analise.registryB})`
                    : ""}
                  . Differences below may reflect the contract change, not the systems.
                </p>
              </div>
            )}

            <div className="divide-y divide-[rgba(255,255,255,0.05)]">
              {analise.pares.map((par) => (
                <div
                  key={par.id}
                  className="flex items-center gap-4 py-3"
                  data-testid={`compare-${par.id}`}
                  data-comparavel={par.kind === "comparavel"}
                >
                  <p className="w-56 flex-shrink-0 text-xs text-[#94A3B8]">{par.rotulo}</p>
                  <div className="flex-1">
                    <Valor ind={par.a} />
                  </div>
                  <div className="flex-1">
                    <Valor ind={par.b} />
                  </div>
                  <div className="w-24 flex-shrink-0 text-right">
                    {par.kind === "comparavel" ? (
                      <Delta valor={par.delta} />
                    ) : (
                      <span className="text-[11px] text-[#475569]">not comparable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
