interface ImproveAnalysisPanelProps {
  suggestions: string[];
}

export default function ImproveAnalysisPanel({ suggestions }: ImproveAnalysisPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">Improve this analysis</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <span
            key={item}
            className="rounded-md border border-border/45 bg-background/30 px-2.5 py-1 text-xs text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
