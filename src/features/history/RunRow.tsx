import { useNavigate } from "react-router-dom";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { LinhaHistorico } from "@/features/canonical-analysis/data/historicoView";

/**
 * Linha do histórico — componente de APRESENTAÇÃO.
 *
 * Recebe um view model já normalizado por `historicoView` e não faz mais nada: sem rede, sem
 * Supabase, sem cálculo de métrica, sem autorização, sem conhecer projeto ou ambiente.
 *
 * ## O que saiu, e por quê
 *
 * * **Risco** — `risk_level` não existe no registro canônico de indicadores. A coluna some;
 *   marcá-la "indisponível" afirmaria que um dia chega por aqui.
 * * **Intents** — `n_intents` idem: há taxa de cobertura e variância de intent, nenhuma é
 *   contagem.
 * * **Score de comportamento** — vinha de `extractBehaviorScore(raw_result)`, que vasculhava
 *   quatro caminhos possíveis no documento bruto e arredondava. Era **cálculo analítico no
 *   frontend** sobre um RESULT_FIELD; obtê-lo por linha exigiria abrir o resultado de cada
 *   análise, que é o N+1 proibido.
 *
 * O que ficou é o que a listagem canônica afirma. Ausência é renderizada como ausência.
 */

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; styles: string }> = {
  completed:  { label: "Completed",  styles: "bg-[rgba(52,211,153,0.08)] text-[#34D399] border-[rgba(52,211,153,0.15)]" },
  analyzing:  { label: "Analyzing",  styles: "bg-[rgba(167,139,250,0.08)] text-[#A78BFA] border-[rgba(167,139,250,0.15)]" },
  running:    { label: "Running",    styles: "bg-[rgba(79,90,232,0.08)] text-[#4F5AE8] border-[rgba(79,90,232,0.15)]" },
  preparing:  { label: "Preparing",  styles: "bg-[rgba(79,90,232,0.08)] text-[#4F5AE8] border-[rgba(79,90,232,0.15)]" },
  queued:     { label: "Queued",     styles: "bg-[rgba(148,163,184,0.08)] text-[#94A3B8] border-[rgba(148,163,184,0.15)]" },
  recovering: { label: "Recovering", styles: "bg-[rgba(252,211,77,0.08)] text-[#FCD34D] border-[rgba(252,211,77,0.15)]" },
  failed:     { label: "Failed",     styles: "bg-[rgba(248,113,113,0.08)] text-[#F87171] border-[rgba(248,113,113,0.15)]" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? {
    // Estado novo do contrato que esta build ainda não conhece: mostra o valor CRU, em vez de
    // colapsar em "completed". Rotular errado é pior que rotular feio.
    label: status,
    styles: "bg-[rgba(148,163,184,0.08)] text-[#94A3B8] border-[rgba(148,163,184,0.15)]",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border", cfg.styles)}>
      {cfg.label}
    </span>
  );
}

// ─── Métrica com ausência explícita ──────────────────────────────────────────

const INDISPONIVEL = "—";

function Metrica({
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
    <div data-testid={testId} data-estado={ausente ? "indisponivel" : "medido"}>
      <p className="text-[10px] text-[#475569] uppercase tracking-widest font-semibold">{rotulo}</p>
      <p
        className={cn("text-sm font-medium text-[#94A3B8]", mono && "text-xs font-mono text-[#475569]")}
        aria-label={ausente ? `${rotulo}: unavailable` : undefined}
      >
        {ausente ? INDISPONIVEL : valor}
      </p>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function CompareCheckbox({ checked, disabled }: { checked: boolean; disabled: boolean }) {
  return (
    <div
      className={cn(
        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all",
        checked
          ? "bg-[rgba(79,90,232,0.15)] border-[#4F5AE8]"
          : "bg-transparent border-[rgba(255,255,255,0.14)]",
        disabled && "opacity-40",
      )}
      aria-hidden="true"
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-[#4F5AE8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

// ─── RunRow ───────────────────────────────────────────────────────────────────

interface RunRowProps {
  linha: LinhaHistorico;
  compareMode?: boolean;
  selected?: boolean;
  /** True quando 2 análises já estão selecionadas e esta não é uma delas. */
  compareDimmed?: boolean;
  onToggleSelect?: (analysisId: string) => void;
}

export function RunRow({
  linha,
  compareMode = false,
  selected = false,
  compareDimmed = false,
  onToggleSelect,
}: RunRowProps) {
  const navigate = useNavigate();
  const dateFormatted = linha.createdAt
    ? new Date(linha.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : INDISPONIVEL;

  function handleClick() {
    if (compareMode) {
      if (compareDimmed) return;
      onToggleSelect?.(linha.analysisId);
      return;
    }
    navigate(`/canonical/analyses/${encodeURIComponent(linha.analysisId)}/result`);
  }

  return (
    <div
      data-testid={`run-row-${linha.analysisId}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 transition-all cursor-pointer hover:bg-[rgba(255,255,255,0.02)] group",
        !linha.resultAvailable && !compareMode && "opacity-60",
        compareMode && selected && "bg-[rgba(79,90,232,0.04)] border-l-2 border-l-[#4F5AE8]",
        compareMode && compareDimmed && "opacity-40 pointer-events-none",
      )}
      onClick={handleClick}
      role={compareMode ? "checkbox" : "button"}
      aria-checked={compareMode ? selected : undefined}
      tabIndex={compareDimmed ? -1 : 0}
      aria-label={
        compareMode
          ? `${selected ? "Deselect" : "Select"} analysis from ${dateFormatted} for comparison`
          : `View analysis from ${dateFormatted}`
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {compareMode && (
        <div className="flex-shrink-0">
          <CompareCheckbox checked={selected} disabled={compareDimmed} />
        </div>
      )}

      <div className="w-32 flex-shrink-0">
        <p className="text-sm font-medium text-[#94A3B8] leading-tight">{dateFormatted}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-[#475569]">
            {linha.createdAt ? formatRelativeTime(linha.createdAt) : INDISPONIVEL}
          </p>
          <StatusBadge status={linha.status} />
        </div>
      </div>

      <div className="flex items-center gap-5 flex-1 min-w-0">
        <Metrica
          testId={`run-convs-${linha.analysisId}`}
          rotulo="Convs"
          valor={linha.nConversations}
        />
        <Metrica
          testId={`run-records-${linha.analysisId}`}
          rotulo="Records"
          valor={linha.recordCount}
        />
        <div className="hidden md:block">
          <Metrica
            testId={`run-engine-${linha.analysisId}`}
            rotulo="Engine"
            valor={linha.engineVersion}
            mono
          />
        </div>
      </div>

      {!compareMode && (
        <div className="w-16 flex-shrink-0 flex justify-end">
          <div className="flex items-center gap-1.5 text-[#94A3B8] group-hover:text-[#4F5AE8] transition-colors">
            <span className="text-xs font-medium">{linha.resultAvailable ? "View" : "Details"}</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      )}

      {compareMode && (
        <div className="w-16 flex-shrink-0 flex justify-end">
          {selected && <span className="text-[11px] font-semibold text-[#4F5AE8]">Selected</span>}
        </div>
      )}
    </div>
  );
}
