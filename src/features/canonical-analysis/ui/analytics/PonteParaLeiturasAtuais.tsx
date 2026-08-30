import { ArrowRight, BarChart3, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { VISOES_DA_ANALISE } from "../visoes";

interface PonteParaLeiturasAtuaisProps {
  analysisId: string;
}

/**
 * Orienta quem chegou por um deep link histórico para as duas leituras atuais.
 *
 * A ponte não resume nem recalcula o resultado. Ela só explica a responsabilidade de cada rota e
 * deixa explícita a ordem recomendada: primeiro compreender o diagnóstico, depois explorar as
 * medidas que o sustentam.
 */
export function PonteParaLeiturasAtuais({ analysisId }: PonteParaLeiturasAtuaisProps) {
  const { t } = useLanguage();
  const conteudo = {
    argos: {
      description: t("canonicalAnalysis.result.currentViews.argosDescription"),
      icon: ScanSearch,
      recommended: true,
    },
    analytics: {
      description: t("canonicalAnalysis.result.currentViews.analyticsDescription"),
      icon: BarChart3,
      recommended: false,
    },
  } as const;

  return (
    <nav
      aria-labelledby="leituras-atuais-titulo"
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
        "motion-reduce:animate-none",
      )}
    >
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
          {t("canonicalAnalysis.result.currentViews.eyebrow")}
        </p>
        <h2 id="leituras-atuais-titulo" className="mt-2 text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.result.currentViews.title")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("canonicalAnalysis.result.currentViews.intro")}
        </p>
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {VISOES_DA_ANALISE.map((visao) => {
          // Esta ponte vive somente na página histórica de resultado. O Review é uma capacidade
          // nova e não reescreve a promessa desses links já salvos.
          if (visao.caminho === "review") return null;
          const item = conteudo[visao.caminho];
          const Icon = item.icon;
          const titulo =
            visao.caminho === "argos"
              ? t("canonicalAnalysis.shell.view.argos")
              : t("canonicalAnalysis.shell.view.analytics");
          return (
            <li key={visao.caminho}>
              <Link
                to={`/analyses/${encodeURIComponent(analysisId)}/${visao.caminho}`}
                className={cn(
                  "group flex min-h-28 h-full items-start gap-3 rounded-lg border p-4",
                  "transition-[border-color,background-color,box-shadow] duration-200",
                  "motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.recommended
                    ? "border-primary/40 bg-primary/[0.06] hover:border-primary/65 hover:bg-primary/[0.09]"
                    : "border-border bg-background/50 hover:border-foreground/25 hover:bg-accent/35",
                )}
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground"
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{titulo}</span>
                    {item.recommended ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {t("canonicalAnalysis.result.currentViews.recommended")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    {t("canonicalAnalysis.result.currentViews.open")}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-200 motion-reduce:transition-none group-hover:translate-x-0.5"
                    />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
