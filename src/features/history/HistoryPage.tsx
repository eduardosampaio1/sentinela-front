import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { SkeletonHistoryTable } from "@/shared/states/SkeletonState";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysesList } from "@/features/canonical-analysis/data/list";
import {
  linhaHistoricoDe,
  type LinhaHistorico,
} from "@/features/canonical-analysis/data/historicoView";
import { cn } from "@/lib/utils";
import { RunRow } from "./RunRow";
import { RunComparePanel } from "./RunComparePanel";

/**
 * Histórico de análises — jornada CANÔNICA.
 *
 * Escopo é o **workspace autenticado**. O eixo `(workspace, project, environment)` do modelo
 * legado saiu inteiro: era a precondição que fazia o `/v1` devolver `400`, e o contrato canônico
 * escopa por workspace.
 *
 * ## Uma requisição por página
 *
 * O carregamento usa só `GET /v1/analyses`. O resumo de cada linha (conversas, engine) vem
 * materializado pelo backend na mesma query (rc16). Nada aqui abre `/result` para montar a
 * lista — comparar é o único caminho que lê resultado, e só por ação explícita do usuário.
 *
 * ## Os dois filtros que saíram
 *
 * A barra filtrava por **risco** e por **faixa de score**:
 *
 * * `risk_level` não existe no registro canônico de indicadores;
 * * o score vinha de `raw_result` — RESULT_FIELD — e obtê-lo por linha seria N+1.
 *
 * Nenhum foi substituído por aproximação: escolher arbitrariamente um indicador como "o score",
 * ou derivar um risco, seria inventar justamente o número que o usuário usa para decidir. Os
 * controles saíram em vez de ficarem visíveis sem funcionar. O gap está registrado em
 * `docs/supabase-zero/CLUSTER-HISTORICO.md`; reintroduzi-los depende de decisão de produto mais
 * contrato materializado no backend, sem N+1.
 */

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader({ compareMode }: { compareMode: boolean }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      {compareMode && <div className="w-4 flex-shrink-0" />}
      <div className="w-32 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Date</p>
      </div>
      <div className="flex items-center gap-5 flex-1">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Conversations</p>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569]">Records</p>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] hidden md:block">Engine</p>
      </div>
      <div className="w-16 flex-shrink-0" />
    </div>
  );
}

// ─── Compare toggle ───────────────────────────────────────────────────────────

function CompareToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-all px-3 py-1.5 rounded-lg border",
        active
          ? "bg-[rgba(79,90,232,0.10)] text-[#4F5AE8] border-[rgba(79,90,232,0.20)] hover:bg-[rgba(79,90,232,0.15)]"
          : "text-[#94A3B8] border-[rgba(255,255,255,0.08)] hover:text-[#94A3B8] hover:border-[rgba(255,255,255,0.14)] bg-transparent",
      )}
      aria-label={active ? "Cancel compare mode" : "Enter compare mode"}
      aria-pressed={active}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M12 4v16" />
      </svg>
      {active ? "Cancel" : "Compare"}
    </button>
  );
}

// ─── Floating selection bar ───────────────────────────────────────────────────

function FloatingSelectionBar({
  selectedCount,
  onCompare,
  onClear,
}: {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
}) {
  const ready = selectedCount === 2;
  const label =
    selectedCount === 0
      ? "Select 2 analyses to compare"
      : selectedCount === 1
        ? "1 analysis selected — select one more"
        : "2 analyses selected — ready to compare";

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl"
      style={{
        background: "#0D1424",
        border: "1px solid rgba(79,90,232,0.15)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,90,232,0.06)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", ready ? "bg-[#34D399]" : "bg-[#475569]")} />
        <span className={cn("text-xs font-medium", ready ? "text-[#F1F5F9]" : "text-[#94A3B8]")}>{label}</span>
      </div>

      <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />

      <button
        onClick={onCompare}
        disabled={!ready}
        data-testid="compare-now"
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
          ready
            ? "bg-[rgba(79,90,232,0.12)] text-[#4F5AE8] border border-[rgba(79,90,232,0.25)] hover:bg-[rgba(79,90,232,0.18)] cursor-pointer"
            : "bg-[rgba(255,255,255,0.03)] text-[#475569] border border-[rgba(255,255,255,0.06)] opacity-50 cursor-not-allowed",
        )}
        aria-disabled={!ready}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M12 4v16" />
        </svg>
        Compare now
      </button>

      <button onClick={onClear} className="text-[11px] text-[#475569] hover:text-[#94A3B8] transition-colors">
        Clear
      </button>
    </div>
  );
}

// ─── HistoryPage ──────────────────────────────────────────────────────────────

export function HistoryPage() {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparar, setComparar] = useState<[LinhaHistorico, LinhaHistorico] | null>(null);

  const escopo = workspace?.id ? { workspaceId: workspace.id } : null;
  const { data, isPending, error, refetch } = useAnalysesList(escopo);

  const linhas: LinhaHistorico[] = useMemo(
    () => (data?.items ?? []).map(linhaHistoricoDe),
    [data],
  );

  function handleToggleCompareMode() {
    setCompareMode((antes) => !antes);
    setSelectedIds([]);
  }

  function handleToggleSelect(analysisId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(analysisId)) return prev.filter((x) => x !== analysisId);
      if (prev.length < 2) return [...prev, analysisId];
      return prev;
    });
  }

  function handleCompareNow() {
    if (selectedIds.length !== 2) return;
    const a = linhas.find((l) => l.analysisId === selectedIds[0]);
    const b = linhas.find((l) => l.analysisId === selectedIds[1]);
    if (!a || !b) return;
    // A é a mais ANTIGA: um delta lido como "de A para B" só faz sentido em ordem cronológica.
    // Data ausente vai para o fim — ordenar por um valor que não existe seria inventá-lo.
    const ta = a.createdAt ? Date.parse(a.createdAt) : Number.POSITIVE_INFINITY;
    const tb = b.createdAt ? Date.parse(b.createdAt) : Number.POSITIVE_INFINITY;
    setComparar(ta <= tb ? [a, b] : [b, a]);
  }

  const showFloatingBar = compareMode && selectedIds.length > 0;
  const semWorkspace = !escopo;

  return (
    <AppShell topBarTitle="History">
      <PageFrame maxWidth="2xl">
        <PageHeader
          title="Analysis history"
          description={
            semWorkspace ? "Select an active workspace to view analyses." : (workspace?.name ?? "")
          }
          actions={
            !semWorkspace && (
              <div className="flex items-center gap-2">
                <CompareToggleButton active={compareMode} onClick={handleToggleCompareMode} />
                <button
                  onClick={() => void refetch()}
                  className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
                  aria-label="Refresh history"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refresh
                </button>
              </div>
            )
          }
        />

        {semWorkspace && (
          <EmptyState
            title="Workspace required"
            description="History is scoped to the workspace you are signed in to. Choose a workspace to see past analyses."
            action={{ label: "Choose workspace", onClick: () => navigate("/workspaces") }}
          />
        )}

        {!semWorkspace && isPending && <SkeletonHistoryTable rows={6} />}

        {!semWorkspace && !isPending && error && (
          <ErrorState
            title="History could not be loaded"
            message="Analysis history could not be retrieved. Check your connection and try again."
            onRetry={() => void refetch()}
          />
        )}

        {!semWorkspace && !isPending && !error && linhas.length === 0 && (
          <EmptyState
            title="No analyses yet"
            description="No analyses have been recorded for this workspace. Run your first analysis to start building a history."
            action={{ label: "Run first analysis", onClick: () => navigate("/canonical/analyses/new") }}
          />
        )}

        {!semWorkspace && !isPending && !error && linhas.length > 0 && (
          <>
            {compareMode && (
              <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-[rgba(79,90,232,0.05)] border border-[rgba(79,90,232,0.12)]">
                <svg className="w-3.5 h-3.5 text-[#4F5AE8] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-[#4F5AE8]">
                  Select 2 analyses to compare them side by side. Click a row to toggle selection.
                </span>
              </div>
            )}

            <div
              className="card-base overflow-hidden"
              style={showFloatingBar ? { paddingBottom: "5rem" } : undefined}
            >
              <TableHeader compareMode={compareMode} />
              {linhas.map((linha) => {
                const isSelected = selectedIds.includes(linha.analysisId);
                return (
                  <RunRow
                    key={linha.analysisId}
                    linha={linha}
                    compareMode={compareMode}
                    selected={isSelected}
                    compareDimmed={compareMode && selectedIds.length === 2 && !isSelected}
                    onToggleSelect={handleToggleSelect}
                  />
                );
              })}
            </div>
          </>
        )}
      </PageFrame>

      {showFloatingBar && (
        <FloatingSelectionBar
          selectedCount={selectedIds.length}
          onCompare={handleCompareNow}
          onClear={() => setSelectedIds([])}
        />
      )}

      {comparar && escopo && (
        <RunComparePanel
          escopo={escopo}
          linhaA={comparar[0]}
          linhaB={comparar[1]}
          onClose={() => setComparar(null)}
        />
      )}
    </AppShell>
  );
}
