// Portão da JORNADA canônica (Onda 6 E2, item 1). Gated pela flag: OFF → redireciona (nenhuma
// rota canônica substitui a viva). ON → segue para as rotas `/canonical/*`.
//
// A fundação de dados saiu daqui na Onda 8 (Macrofrente 1) e subiu para `app/FundacaoV1`, sob o
// `ProtectedRoute`. O motivo está escrito lá: as telas legadas migradas leem `/v1` e não passam
// por este layout. O que sobra aqui é só o portão — que continua sendo assunto da flag, porque
// só ele decide se a jornada canônica substitui a viva.

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isCanonicalAnalysisEnabled } from "../flag";

/**
 * São DUAS perguntas, e confundi-las produz a mensagem errada.
 *
 *   flag local  → este build quer a jornada canônica
 *   capability  → o Gateway realmente montou `/v1/analyses`
 *
 * Achado de review cruzado (Média): o frontend só olhava a flag. Com ela ligada e
 * `SENTINELA_PUBLIC_API_V1_ENABLED` desligado no backend, a rota `/v1/analyses` sequer existe;
 * o 404 do FastAPI chega ao cliente e é normalizado como `forbidden_or_not_found`. O usuário
 * lia "não existe ou não é seu" quando a causa era "a API pública não está montada neste
 * ambiente" — um erro de configuração apresentado como um erro de permissão dele.
 *
 * A capability vem de `/v1/me`, que o AuthContext já busca. Enquanto ela não chegou não há o
 * que decidir: `undefined` NÃO é "desligado", e tratar ausência de resposta como negativa
 * fecharia a jornada durante o carregamento normal.
 */
export function CanonicalAnalysisLayout() {
  const { capabilities, membershipsLoading } = useAuth();

  if (!isCanonicalAnalysisEnabled()) {
    return <Navigate to="/home" replace />;
  }
  if (membershipsLoading || capabilities === null) {
    return null;
  }
  if (capabilities.canonical_analysis_enabled === false) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
