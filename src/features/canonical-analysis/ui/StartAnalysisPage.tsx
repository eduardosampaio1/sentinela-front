// Entrada da jornada (Onda 6 E2, itens 2-4). Auth → workspace ativo → prepare com Idempotency-Key
// da INTENÇÃO → recebe analysis_id → navega para a identidade durável /canonical/analyses/:id.

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useCreateAnalysis } from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { ProblemNotice } from "./notices";

export function StartAnalysisPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const scope = useCanonicalScope();
  const intent = useIdempotencyIntent();
  const create = useCreateAnalysis();

  function iniciar() {
    if (!scope || create.isPending) return;
    // Chave por INTENÇÃO explícita: gerada aqui, reusada em retry da mesma intenção; reset no sucesso.
    const idempotencyKey = intent.ensure();
    create.mutate(
      { scope, idempotencyKey },
      {
        onSuccess: (handle) => {
          intent.reset();
          navigate(`/canonical/analyses/${encodeURIComponent(handle.analysis_id)}`);
        },
      },
    );
  }

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.entry.title")}>
      <PageFrame maxWidth="md">
        <div className="space-y-6" data-testid="canonical-start">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("canonicalAnalysis.entry.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("canonicalAnalysis.entry.subtitle")}</p>
          </div>
          {!scope && (
            <p role="alert" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.entry.workspaceMissing")}
            </p>
          )}
          <ProblemNotice error={create.error} />
          <Button onClick={iniciar} disabled={!scope || create.isPending} aria-busy={create.isPending}>
            {create.isPending ? t("canonicalAnalysis.entry.starting") : t("canonicalAnalysis.entry.start")}
          </Button>
        </div>
      </PageFrame>
    </AppShell>
  );
}
