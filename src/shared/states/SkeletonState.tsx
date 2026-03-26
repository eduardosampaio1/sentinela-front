import { cn } from "@/lib/utils";

// ─── Primitive pulse block ─────────────────────────────────────────────────────

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[rgba(255,255,255,0.04)]",
        className
      )}
      aria-hidden="true"
    />
  );
}

// ─── History table row skeleton ───────────────────────────────────────────────

export function SkeletonHistoryRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.04)] last:border-b-0">
      {/* Date */}
      <div className="w-32 flex-shrink-0 space-y-1.5">
        <Pulse className="h-3.5 w-24" />
        <Pulse className="h-2.5 w-16" />
      </div>
      {/* Risk */}
      <div className="w-24 flex-shrink-0">
        <Pulse className="h-5 w-16 rounded-full" />
      </div>
      {/* Score */}
      <div className="w-20 flex-shrink-0">
        <Pulse className="h-5 w-14 rounded-lg" />
      </div>
      {/* Stats */}
      <div className="flex items-center gap-5 flex-1">
        <div className="space-y-1">
          <Pulse className="h-2 w-8" />
          <Pulse className="h-3.5 w-6" />
        </div>
        <div className="space-y-1">
          <Pulse className="h-2 w-8" />
          <Pulse className="h-3.5 w-6" />
        </div>
        <div className="hidden md:block space-y-1">
          <Pulse className="h-2 w-10" />
          <Pulse className="h-3.5 w-16" />
        </div>
      </div>
      {/* CTA */}
      <div className="w-16 flex-shrink-0 flex justify-end">
        <Pulse className="h-3.5 w-10" />
      </div>
    </div>
  );
}

export function SkeletonHistoryTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <Pulse className="h-2.5 w-8 flex-shrink-0" />
        <Pulse className="h-2.5 w-8 flex-shrink-0" />
        <Pulse className="h-2.5 w-10 flex-shrink-0" />
        <Pulse className="h-2.5 w-24 flex-1" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonHistoryRow key={i} />
      ))}
    </div>
  );
}

// ─── Metric card skeleton ─────────────────────────────────────────────────────

export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-base p-5 space-y-3", className)}>
      <Pulse className="h-2.5 w-20" />
      <Pulse className="h-7 w-32" />
      <div className="space-y-1.5">
        <Pulse className="h-2.5 w-full" />
        <Pulse className="h-2.5 w-3/4" />
      </div>
    </div>
  );
}

// ─── Dashboard section skeleton ───────────────────────────────────────────────

export function SkeletonDashboardSection({ className }: { className?: string }) {
  return (
    <div className={cn("card-base p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Pulse className="h-2.5 w-full" />
        <Pulse className="h-2.5 w-5/6" />
        <Pulse className="h-2.5 w-4/5" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Pulse className="h-16 rounded-xl" />
        <Pulse className="h-16 rounded-xl" />
        <Pulse className="h-16 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Profile section skeleton ─────────────────────────────────────────────────

export function SkeletonProfileSection({ className }: { className?: string }) {
  return (
    <div className={cn("card-base p-6 space-y-5", className)}>
      <div className="flex items-center gap-4">
        <Pulse className="w-14 h-14 rounded-2xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Pulse className="h-4 w-36" />
          <Pulse className="h-3 w-48" />
          <Pulse className="h-2.5 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Pulse className="h-2.5 w-20" />
        <Pulse className="h-10 w-full rounded-xl" />
        <Pulse className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
