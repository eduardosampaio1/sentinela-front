// Portão da JORNADA canônica (Onda 6 E2, item 1). Gated pela flag: OFF → redireciona (nenhuma
// rota canônica substitui a viva). ON → segue para as rotas `/canonical/*`.
//
// A fundação de dados saiu daqui na Onda 8 (Macrofrente 1) e subiu para `app/FundacaoV1`, sob o
// `ProtectedRoute`. O motivo está escrito lá: as telas legadas migradas leem `/v1` e não passam
// por este layout. O que sobra aqui é só o portão — que continua sendo assunto da flag, porque
// só ele decide se a jornada canônica substitui a viva.

import { Navigate, Outlet } from "react-router-dom";
import { isCanonicalAnalysisEnabled } from "../flag";

export function CanonicalAnalysisLayout() {
  if (!isCanonicalAnalysisEnabled()) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
