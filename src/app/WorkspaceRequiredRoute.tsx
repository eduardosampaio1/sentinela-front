import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/design/patterns";

/** Gate único para qualquer superfície que lê ou escreve dados de tenant. */
export function WorkspaceRequiredRoute() {
  const { memberships, membershipsLoading, membershipsError, workspace } = useAuth();

  if (membershipsLoading) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
        <LoadingState rotulo="Loading your workspace" linhas={2} />
      </div>
    );
  }

  if (membershipsError || memberships.length === 0 || !workspace) {
    return <Navigate to="/workspaces" replace />;
  }

  return <Outlet />;
}
