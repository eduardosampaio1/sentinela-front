import { Check, Clock3, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { CaminhoDaVisao, VisaoDaAnalise } from "./visoes";

export type DisponibilidadeDaVisao = "available" | "preparing" | "unavailable";

const ICONE = {
  available: Check,
  preparing: Clock3,
  unavailable: X,
} as const;

const TOM = {
  available: "border-success/40 bg-success/10 text-foreground",
  preparing: "border-primary/35 bg-primary/10 text-foreground",
  unavailable: "border-border bg-muted/40 text-muted-foreground",
} as const;

/**
 * As duas leituras têm relógios independentes. Esta região nunca esconde uma delas por causa da
 * outra: abre o que já existe e explica, em linguagem de produto, o que ainda falta.
 */
export function DisponibilidadeDasVisoes({
  analysisId,
  estados,
  visoes,
}: {
  analysisId: string;
  estados: Readonly<Record<CaminhoDaVisao, DisponibilidadeDaVisao>>;
  visoes: readonly VisaoDaAnalise[];
}) {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="analysis-views-availability" className="space-y-3">
      <div className="space-y-1">
        <h2 id="analysis-views-availability" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.viewsAvailability.title")}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("canonicalAnalysis.viewsAvailability.help")}
        </p>
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {visoes.map((visao) => {
          const estado = estados[visao.caminho];
          const Icone = ICONE[estado];
          const titulo = t(`canonicalAnalysis.shell.view.${visao.caminho}`);

          return (
            <li
              key={visao.caminho}
              className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                    TOM[estado],
                  )}
                >
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-foreground">{titulo}</h3>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t(`canonicalAnalysis.viewsAvailability.state.${estado}`)}
                  </p>
                </div>
              </div>

              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                {t(`canonicalAnalysis.viewsAvailability.${visao.caminho}.${estado}`)}
              </p>

              {estado === "available" ? (
                <Button className="mt-4 min-h-11 w-full sm:w-auto sm:self-start" variant="outline" asChild>
                  <Link
                    aria-label={titulo}
                    to={`/analyses/${encodeURIComponent(analysisId)}/${visao.caminho}`}
                  >
                    {t(`canonicalAnalysis.viewsAvailability.open.${visao.caminho}`)}
                  </Link>
                </Button>
              ) : (
                <p role="status" className="mt-4 min-h-11 content-center text-sm text-muted-foreground">
                  {t("canonicalAnalysis.viewsAvailability.automatic")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
