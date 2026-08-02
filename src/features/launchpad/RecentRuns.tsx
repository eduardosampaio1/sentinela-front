import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysesList } from "@/features/canonical-analysis/data/list";
import { linhaHistoricoDe, type LinhaHistorico } from "@/features/canonical-analysis/data/historicoView";
import { cn, formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/shared/states/LoadingState";
import { EmptyState } from "@/shared/states/EmptyState";

/**
 * Análises recentes — jornada CANÔNICA.
 *
 * Escopo é o **workspace autenticado**, e só ele. O eixo `(workspace, project, environment)` do
 * histórico legado não participa: era a precondição que fazia o `/v1` devolver `400`, e o
 * modelo canônico escopa por workspace.
 *
 * ## Colunas que sumiram, e por quê
 *
 * O card legado exibia `risk_level` e `n_intents`, lidos do `raw_result` do motor LEGADO. Nenhum
 * dos dois existe no modelo canônico — não há indicador de risco nem contagem de intents no
 * registro. Não estão aqui como "indisponível" porque isso sugeriria que um dia chegam por este
 * caminho; eles só chegam se o registro de indicadores passar a medi-los.
 *
 * O que o backend afirma é renderizado; o que ele não afirma aparece como **indisponível**,
 * nunca como `0` nem como texto inventado. `0` medido continua sendo `0`.
 */

const INDISPONIVEL = "—";

/** Célula que distingue medição de ausência — a distinção que o usuário lê. */
function Celula({
  testId,
  rotulo,
  valor,
  mono,
}: {
  testId: string;
  rotulo: string;
  valor: string | number | null;
  mono?: boolean;
}) {
  const ausente = valor === null;
  return (
    <div className="text-left" data-testid={testId} data-estado={ausente ? "indisponivel" : "medido"}>
      <p className="text-xs text-[#94A3B8]">{rotulo}</p>
      <p
        className={cn("text-sm font-medium text-[#94A3B8]", mono && "text-xs font-mono")}
        aria-label={ausente ? `${rotulo}: unavailable` : undefined}
      >
        {ausente ? INDISPONIVEL : valor}
      </p>
    </div>
  );
}

interface RecentRunsProps {
  maxRuns?: number;
}

export function RecentRuns({ maxRuns = 5 }: RecentRunsProps) {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const escopo = workspace?.id ? { workspaceId: workspace.id } : null;
  // UMA requisição para a página inteira. O resumo (conversas, engine) vem materializado pelo
  // backend na mesma query; abrir o resultado de cada linha seria N+1 numa tela de entrada.
  const { data, isPending, error } = useAnalysesList(escopo);

  if (!escopo) {
    return null;
  }
  if (isPending) {
    return <LoadingState message="Loading recent analyses" size="sm" className="py-8" data-testid="recent-loading" />;
  }
  if (error) {
    return (
      <div className="card-base p-5">
        <p className="section-label mb-3">Recent analyses</p>
        <p className="text-sm text-[#F87171]">Failed to load recent analyses.</p>
      </div>
    );
  }

  const linhas: LinhaHistorico[] = (data?.items ?? []).slice(0, maxRuns).map(linhaHistoricoDe);

  if (linhas.length === 0) {
    return (
      <div className="card-base p-6">
        <p className="section-label mb-4">Recent analyses</p>
        <EmptyState
          title="No analyses yet"
          description="Run your first analysis to start building your history. Upload a dataset above to get started."
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Recent analyses</p>
        <button
          onClick={() => navigate("/canonical/analyses")}
          className="text-xs text-[#4F5AE8] hover:text-[#3E48C4] transition-colors"
        >
          View all
        </button>
      </div>

      <div className="space-y-2">
        {linhas.map((linha) => (
          <button
            key={linha.analysisId}
            // O resultado vive na rota canônica. `result_available` continua significando
            // EXISTÊNCIA do resultado — não a forma interna do documento.
            onClick={() => navigate(`/canonical/analyses/${encodeURIComponent(linha.analysisId)}/result`)}
            disabled={!linha.resultAvailable}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] transition-all group text-left",
              linha.resultAvailable
                ? "hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.08)] cursor-pointer"
                : "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex-shrink-0 text-left min-w-[80px]">
              <p className="text-xs text-[#94A3B8]">
                {linha.createdAt ? formatRelativeTime(linha.createdAt) : INDISPONIVEL}
              </p>
            </div>

            <div className="flex-1 flex items-center gap-6 min-w-0">
              <Celula
                testId={`recent-conversations-${linha.analysisId}`}
                rotulo="Conversations"
                valor={linha.nConversations}
              />
              <Celula
                testId={`recent-records-${linha.analysisId}`}
                rotulo="Records"
                valor={linha.recordCount}
              />
              {/* A célula "Engine" saiu daqui junto com o campo: `engine_version` está em
                  `nunca_publicos` do contrato congelado, e o cliente nunca vê Engine. O
                  wrapper `hidden sm:block` foi embora com ela — sozinho ele continuaria
                  ocupando o gap do flex. */}
            </div>

            {linha.resultAvailable && (
              <svg
                className="w-4 h-4 text-[#475569] group-hover:text-[#4F5AE8] transition-colors flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
