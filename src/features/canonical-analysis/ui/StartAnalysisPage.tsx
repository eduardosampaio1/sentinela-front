// Entrada da jornada (Onda 6 E2, itens 2-4). Auth → workspace ativo → prepare com Idempotency-Key
// da INTENÇÃO → recebe analysis_id → navega para a identidade durável /canonical/analyses/:id.

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useCreateAnalysis } from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { ProblemNotice, problemCodeOf } from "./notices";

export function StartAnalysisPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const scope = useCanonicalScope();
  const intent = useIdempotencyIntent();
  const create = useCreateAnalysis();

  // M33 — o 409 tem tratamento próprio, e não vira "algo deu errado".
  //
  // `idempotency_conflict` significa que ESTA intenção já foi registrada. O contrato não publica
  // qual análise a atendeu, então a tela não a adivinha nem navega para lugar nenhum: diz o que
  // houve e aponta o histórico, que é onde ela estaria.
  const conflito = problemCodeOf(create.error) === "idempotency_conflict";

  function iniciar() {
    if (!scope || create.isPending) return;
    // Chave por INTENÇÃO explícita: gerada aqui, reusada em retry da mesma intenção; reset no
    // desfecho definitivo — o que o próprio `intent.ts` define. Sucesso é um desfecho; recusa por
    // repetição é outro: insistir com a mesma chave conflitaria de novo, para sempre.
    //
    // Reset NÃO é retry automático. Nada é reenviado: um segundo início exige um segundo clique,
    // que é uma segunda intenção declarada por uma pessoa — nunca análise nova em silêncio.
    const idempotencyKey = intent.ensure();
    create.mutate(
      { scope, idempotencyKey },
      {
        onSuccess: (handle) => {
          intent.reset();
          navigate(`/analyses/${encodeURIComponent(handle.analysis_id)}`);
        },
        onError: (erro) => {
          if (problemCodeOf(erro) === "idempotency_conflict") intent.reset();
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
          {conflito ? (
            <div role="alert" className="space-y-2 rounded-md border border-border bg-card p-4 text-sm">
              <p className="font-medium text-foreground">{t("canonicalAnalysis.entry.conflictTitle")}</p>
              <p className="text-muted-foreground">{t("canonicalAnalysis.entry.conflictMeaning")}</p>
              <div className="pt-1">
                <Button variant="outline" asChild>
                  <Link to="/analyses">{t("canonicalAnalysis.entry.conflictAction")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ProblemNotice error={create.error} />
          )}
          <Button onClick={iniciar} disabled={!scope || create.isPending} aria-busy={create.isPending}>
            {create.isPending ? t("canonicalAnalysis.entry.starting") : t("canonicalAnalysis.entry.start")}
          </Button>
        </div>
      </PageFrame>
    </AppShell>
  );
}
