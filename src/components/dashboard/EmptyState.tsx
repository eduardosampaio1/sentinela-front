import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState = ({
  title = "No analysis loaded",
  description = "Upload or paste a JSONL dataset in the Overview to run your first analysis.",
}: EmptyStateProps) => {
  const navigate = useNavigate();

  return (
    <div className="p-12 rounded-xl border border-dashed border-border/50 text-center space-y-4">
      <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{description}</p>
      <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
        Go to Overview
      </Button>
    </div>
  );
};

export default EmptyState;
