interface SignalSummaryPanelProps {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: string }>;
  emptyText: string;
}

export default function SignalSummaryPanel({
  title,
  subtitle,
  items,
  emptyText,
}: SignalSummaryPanelProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{item.value}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

