export default function InterpretationSkeleton() {
  return (
    <div className="mt-5 rounded-3xl border border-border bg-background/50 p-5 animate-pulse">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="mt-4 h-6 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-4 w-full rounded bg-muted" />
      <div className="mt-2 h-4 w-11/12 rounded bg-muted" />

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 p-4">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-10/12 rounded bg-muted" />
        </div>
        <div className="rounded-2xl border border-border/60 p-4">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="mt-3 h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-9/12 rounded bg-muted" />
        </div>
      </div>

      <div className="mt-6 h-4 w-44 rounded bg-muted" />
      <div className="mt-3 h-4 w-full rounded bg-muted" />
      <div className="mt-2 h-4 w-8/12 rounded bg-muted" />
    </div>
  );
}