import QuickScanPanel from "@/components/dashboard-v2/QuickScanPanel";

export default function QuickScanPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Quick Scan</h1>
        <p className="text-sm text-muted-foreground">
          Fast preview mode for rapid triage before a full observability cycle.
        </p>
      </div>
      <QuickScanPanel />
    </div>
  );
}

