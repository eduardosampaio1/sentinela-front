import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { buildLoginPath } from "@/lib/authFlow";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!user) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginPath(nextPath, "session-expired")} replace />;
  }

  return children;
}
