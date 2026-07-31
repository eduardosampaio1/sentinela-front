// Apresentação de estado e de erro público (Onda 6 E3, itens 12 e 17). Só tokens semânticos.

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProblemError, type AnalysisStatusView } from "@/lib/v1";
import { describeAnalysisState } from "../data/stateView";

/** Código público estável de um erro (ou null). NUNCA usa detail/host/texto do backend. */
export function problemCodeOf(error: unknown): string | null {
  return error instanceof ProblemError ? error.problem.code : null;
}

/** Banner de um dos 7 estados. Indeterminado = spinner (nunca %). aria-live/busy. */
export function StateBanner({ view }: { view: Pick<AnalysisStatusView, "status" | "retry_allowed"> }) {
  const { t } = useLanguage();
  const s = describeAnalysisState(view);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={s.indeterminate}
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="flex items-start gap-3">
        {s.indeterminate && <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0">
          <h2 className={`text-lg font-semibold ${s.isError ? "text-destructive" : "text-foreground"}`}>
            {t(s.titleKey)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(s.messageKey)}</p>
        </div>
      </div>
    </div>
  );
}

/** Mensagem de erro público, traduzida pelo CÓDIGO (i18n) — sem texto cru do backend. */
export function ProblemNotice({ error }: { error: unknown }) {
  const { t } = useLanguage();
  const code = problemCodeOf(error);
  if (!code) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
      {t(`canonicalAnalysis.problem.${code}`)}
    </div>
  );
}
