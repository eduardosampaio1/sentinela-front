// Layout da jornada canônica (Onda 6 E2, item 1). Gated pela flag: OFF → redireciona (nenhuma rota
// canônica substitui a viva). ON → monta a fundação (QueryClient canônico + cliente + sessão
// expirada). Escopado à subárvore da rota: inerte quando a flag está desligada.

import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { CanonicalQueryProvider } from "@/lib/v1";
import { CanonicalClientProvider } from "../data/client";
import { isCanonicalAnalysisEnabled } from "../flag";

export function CanonicalAnalysisLayout() {
  const navigate = useNavigate();
  if (!isCanonicalAnalysisEnabled()) {
    return <Navigate to="/home" replace />;
  }
  return (
    <CanonicalQueryProvider onAuthRequired={() => navigate("/session-expired")}>
      <CanonicalClientProvider>
        <Outlet />
      </CanonicalClientProvider>
    </CanonicalQueryProvider>
  );
}
