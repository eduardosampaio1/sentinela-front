import { Badge } from "@/components/ui/badge";

const DashboardTopBar = () => {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Acme Corp Workspace</span>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">Growth Plan</Badge>
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">2,847</span> / 10,000 conversations
        </div>
      </div>
    </header>
  );
};

export default DashboardTopBar;
