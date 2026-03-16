import { Navigate } from "react-router-dom";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useAuth } from "@/contexts/AuthContext";

export default function AnalysisCompletedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { analysisCompleted, historyResolved } = useAnalysis();
  const { workspaceLoading } = useAuth();

  if (workspaceLoading || !historyResolved) {
    return <div className="p-10 text-center text-muted-foreground">Loading analysis context...</div>;
  }

  if (!analysisCompleted) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
