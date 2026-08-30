import { AlertTriangle, ArrowRight, CheckCircle2, EyeOff, FileSearch, Link2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ReviewClaimView, ReviewEvidenceView } from "@/lib/v1";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/design/patterns";
import { useParams } from "react-router-dom";
import { useAnalysisStatus } from "../../data/analysis";
import { useAnalysisReview, useRequestReview } from "../../data/review";
import { AnalysisShell } from "../AnalysisShell";
import { useCanonicalScope } from "../scope";
import type { EstadoPublico } from "@/design/patterns/estados";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="border-t border-border py-7 first:border-t-0 first:pt-0"><h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">{title}</h2><div className="mt-4">{children}</div></section>;
}

function TextList({ items }: { items: readonly string[] }) {
  return <ul className="space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-foreground"><ArrowRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{item}</span></li>)}</ul>;
}

function Claim({ claim, evidence }: { claim: ReviewClaimView; evidence: Map<string, ReviewEvidenceView> }) {
  const { t } = useLanguage();
  return <article className="rounded-xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t(`canonicalAnalysis.review.claim.${claim.kind}`)}</span><span className="text-xs tabular-nums text-muted-foreground">{Math.round(claim.confidence * 100)}% {t("canonicalAnalysis.review.confidence")}</span></div>
    <p className="mt-2 text-sm leading-6 text-foreground">{claim.statement}</p>
    <details className="mt-3 rounded-lg border border-border bg-background/50 px-3 py-2"><summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("canonicalAnalysis.review.showEvidence")}</summary><ul className="mt-3 space-y-2">{claim.evidence_refs.map((ref) => { const item = evidence.get(ref); return <li key={ref} className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{item?.label ?? ref}</span>{item?.excerpt ? ` — ${item.excerpt}` : ""}<code className="mt-1 block break-all font-mono text-[10px]">{item?.pointer}</code></li>; })}</ul></details>
  </article>;
}

export function ReviewPage() {
  const { t } = useLanguage();
  const analysisId = useParams().analysisId ?? null;
  const scope = useCanonicalScope();
  const status = useAnalysisStatus(scope, analysisId);
  const review = useAnalysisReview(scope, analysisId);
  const request = useRequestReview(scope, analysisId);
  const title = t("canonicalAnalysis.review.title");
  const artifact = review.data;
  const evidence = new Map((artifact?.evidence ?? []).map((item) => [item.evidence_id, item]));

  function body() {
    if (review.isPending) return <LoadingState rotulo={t("canonicalAnalysis.review.loading")} />;
    if (!artifact || artifact.status === "not_requested") return <div className="rounded-xl border border-border bg-card p-6"><FileSearch aria-hidden className="h-7 w-7 text-primary" /><h2 className="mt-4 text-xl font-semibold text-foreground">{t("canonicalAnalysis.review.notRequestedTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("canonicalAnalysis.review.notRequestedBody")}</p><Button className="mt-5 min-h-11" disabled={request.isPending} onClick={() => request.mutate()}>{t("canonicalAnalysis.review.generate")}</Button></div>;
    if (artifact.status === "unavailable") return <div role="status" className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">{t("canonicalAnalysis.review.unavailableTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("canonicalAnalysis.review.unavailableBody")}</p></div>;
    if (artifact.status === "queued" || artifact.status === "investigating") return <div role="status" aria-live="polite" className="rounded-xl border border-primary/25 bg-primary/5 p-6"><div className="flex items-center gap-3"><span className="h-3 w-3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" /><h2 className="text-lg font-semibold text-foreground">{t(`canonicalAnalysis.review.${artifact.status}Title`)}</h2></div><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t(`canonicalAnalysis.review.${artifact.status}Body`)}</p></div>;
    if (artifact.status === "failed") return <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h2 className="text-lg font-semibold">{t("canonicalAnalysis.review.failedTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("canonicalAnalysis.review.failedBody")}</p><Button variant="outline" className="mt-4 min-h-11" onClick={() => request.mutate()}>{t("canonicalAnalysis.review.retry")}</Button></div>;

    return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 rounded-[var(--ds-radius-panel)] border border-border bg-card p-5 sm:p-8">
        <section aria-labelledby="executive-summary"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("canonicalAnalysis.review.executiveVerdict")}</p><h2 id="executive-summary" className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{artifact.executive_summary ?? t("canonicalAnalysis.review.noVerdict")}</h2>{artifact.status === "partial" ? <div className="mt-4 flex flex-wrap items-center gap-3"><p role="status" className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-foreground"><AlertTriangle className="h-4 w-4" aria-hidden />{t("canonicalAnalysis.review.partial")}</p><Button variant="outline" className="min-h-11" disabled={request.isPending} onClick={() => request.mutate()}>{t("canonicalAnalysis.review.retry")}</Button></div> : <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden />{t("canonicalAnalysis.review.verified")}</p>}</section>
        {(artifact.what_matters_most?.length ?? 0) > 0 ? <Section id="what-matters" title={t("canonicalAnalysis.review.whatMatters")}><TextList items={artifact.what_matters_most ?? []} /></Section> : null}
        {(artifact.investigations?.length ?? 0) > 0 ? <Section id="cross-signals" title={t("canonicalAnalysis.review.crossSignals")}><div className="space-y-3">{artifact.investigations?.map((item) => <article key={item.investigation_id} className="rounded-xl border border-border bg-background/50 p-4"><h3 className="font-semibold text-foreground">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p></article>)}</div></Section> : null}
        {(artifact.claims?.length ?? 0) > 0 ? <Section id="claims" title={t("canonicalAnalysis.review.claims")}><div className="space-y-3">{artifact.claims?.map((claim) => <Claim key={claim.claim_id} claim={claim} evidence={evidence} />)}</div></Section> : null}
        {(artifact.contradictions?.length ?? 0) > 0 ? <Section id="contradictions" title={t("canonicalAnalysis.review.contradictions")}><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><Scale className="h-4 w-4" aria-hidden />{t("canonicalAnalysis.review.contradictionsHelp")}</div><TextList items={artifact.contradictions ?? []} /></Section> : null}
        {(artifact.business_impact?.length ?? 0) > 0 ? <Section id="business-impact" title={t("canonicalAnalysis.review.businessImpact")}><TextList items={artifact.business_impact ?? []} /></Section> : null}
        {(artifact.recommendations?.length ?? 0) > 0 ? <Section id="recommendations" title={t("canonicalAnalysis.review.recommendations")}><TextList items={artifact.recommendations ?? []} /></Section> : null}
        <Section id="blind-spots" title={t("canonicalAnalysis.review.blindSpots")}><div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><EyeOff className="h-4 w-4" aria-hidden />{t("canonicalAnalysis.review.blindSpotsHelp")}</div><TextList items={artifact.blind_spots?.length ? artifact.blind_spots : [t("canonicalAnalysis.review.noBlindSpots")]} /></Section>
      </div>
      <aside aria-label={t("canonicalAnalysis.review.traceability")} className="h-fit rounded-xl border border-border bg-card p-5 xl:sticky xl:top-6"><Link2 className="h-5 w-5 text-primary" aria-hidden /><h2 className="mt-3 font-semibold text-foreground">{t("canonicalAnalysis.review.traceability")}</h2><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">{t("canonicalAnalysis.review.version")}</dt><dd className="mt-1 font-mono text-foreground">{artifact.version ?? "—"}</dd></div><div><dt className="text-muted-foreground">{t("canonicalAnalysis.review.evidenceCount")}</dt><dd className="mt-1 tabular-nums text-foreground">{artifact.evidence?.length ?? 0}</dd></div></dl></aside>
    </div>;
  }

  return <AppShell topBarTitle={title}><PageFrame maxWidth="full"><div className="space-y-6"><AnalysisShell analysisId={analysisId ?? ""} estado={status.data?.status as EstadoPublico | undefined} titulo={title} />{body()}</div></PageFrame></AppShell>;
}

export default ReviewPage;
