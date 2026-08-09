import { lazy, Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useParams,
  type RouteObject,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/shared/states/LoadingState";
import { FundacaoV1 } from "./FundacaoV1";

// ─── Lazy page imports ─────────────────────────────────────────────────────────

const LandingPage = lazy(() =>
  import("@/features/landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("@/features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const SessionExpiredPage = lazy(() =>
  import("@/features/auth/SessionExpiredPage").then((m) => ({ default: m.SessionExpiredPage }))
);
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const ResetPasswordPage = lazy(() =>
  import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const LaunchpadPage = lazy(() =>
  import("@/features/launchpad/LaunchpadPage").then((m) => ({ default: m.LaunchpadPage }))
);
// `/dashboard` NÃO é mais um dashboard: é rota de compatibilidade que resolve a análise
// canônica no backend e redireciona para o renderizador único.
const DashboardCompatRoute = lazy(() =>
  import("@/features/dashboard/DashboardCompatRoute").then((m) => ({ default: m.DashboardCompatRoute }))
);
const HistoryPage = lazy(() =>
  import("@/features/history/HistoryPage").then((m) => ({ default: m.HistoryPage }))
);
const WorkspacesPage = lazy(() =>
  import("@/features/workspaces/WorkspacesPage").then((m) => ({ default: m.WorkspacesPage }))
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const ProfilePage = lazy(() =>
  import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const NotFoundPage = lazy(() =>
  import("@/features/errors/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);
const ServerErrorPage = lazy(() =>
  import("@/features/errors/ServerErrorPage").then((m) => ({ default: m.ServerErrorPage }))
);
const AionPage = lazy(() =>
  import("@/features/aion/AionPage").then((m) => ({ default: m.AionPage }))
);
const PrivacyPage = lazy(() =>
  import("@/features/legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import("@/features/legal/TermsPage").then((m) => ({ default: m.TermsPage }))
);
const SecurityPage = lazy(() =>
  import("@/features/legal/SecurityPage").then((m) => ({ default: m.SecurityPage }))
);

// ── Jornada canônica /v1 (Onda 6; gated por VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED) ──────────
/**
 * `/dashboard/history/:id` -> `/canonical/analyses/:id/result`.
 *
 * Preserva deep links antigos (favorito, link compartilhado) sem manter uma segunda tela de
 * resultado. `replace` para que o botao voltar nao caia no redirect de novo.
 */
function RedirecionaDetalheLegado() {
  const { id } = useParams();
  if (!id) return <Navigate to="/dashboard/history" replace />;
  return <Navigate to={`/canonical/analyses/${encodeURIComponent(id)}/result`} replace />;
}

const CanonicalAnalysisLayout = lazy(() =>
  import("@/features/canonical-analysis/ui/CanonicalAnalysisLayout").then((m) => ({ default: m.CanonicalAnalysisLayout }))
);
const CanonicalAnalysesList = lazy(() =>
  import("@/features/canonical-analysis/ui/AnalysesListPage").then((m) => ({ default: m.AnalysesListPage }))
);
const CanonicalStartPage = lazy(() =>
  import("@/features/canonical-analysis/ui/StartAnalysisPage").then((m) => ({ default: m.StartAnalysisPage }))
);
const CanonicalAnalysisPage = lazy(() =>
  import("@/features/canonical-analysis/ui/AnalysisPage").then((m) => ({ default: m.AnalysisPage }))
);
// E5: página de resultado em chunk próprio (lazy) — só carrega quando há resultado a ver.
const CanonicalResultPage = lazy(() =>
  import("@/features/canonical-analysis/ui/ResultPage").then((m) => ({ default: m.ResultPage }))
);

// AQUI FICAVAM OS 3 PAINÉIS LEGADOS COM ROTA PRÓPRIA (diagnostics/guardrails/optimization).
//
// Liam `AnalysisContext.result`, cuja única fonte era o cache do navegador. Sem o cache,
// renderizavam vazio — e uma rota que existe para mostrar nada é pior que rota nenhuma:
// ela promete uma tela.
//
// O resultado tem UM renderizador: /canonical/analyses/{id}/result.

// ─── Shared loading screen ─────────────────────────────────────────────────────

function FullScreenLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
      <LoadingState message={message ?? "Loading"} size="md" />
    </div>
  );
}

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      {children}
    </Suspense>
  );
}

// ─── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader message="Verifying your session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

// AQUI FICAVA `AnalysisCompletedRoute`.
//
// Ele autorizava a navegação por `analysisCompleted = hasHistory || Boolean(result)` —
// autorização INDIRETA: `hasHistory` diz que o workspace já teve análise, não que existe
// um resultado para mostrar agora. Era por isso que um workspace com histórico chegava a
// uma tela vazia.
//
// A rota de compatibilidade não precisa de portão: ela mesma pergunta ao backend e decide
// entre redirecionar e mostrar o estado vazio. Quem autoriza o RESULTADO é o Gateway, na
// leitura de `/canonical/analyses/{id}/result`, com o workspace do contexto autenticado.

// ─── Route tree ───────────────────────────────────────────────────────────────

const routes: RouteObject[] = [
  // ── Public landing ────────────────────────────────────────────────────────
  {
    path: "/",
    element: <PageSuspense><LandingPage /></PageSuspense>,
  },
  {
    path: "/aion",
    element: <PageSuspense><AionPage /></PageSuspense>,
  },
  {
    path: "/privacy",
    element: <PageSuspense><PrivacyPage /></PageSuspense>,
  },
  {
    path: "/terms",
    element: <PageSuspense><TermsPage /></PageSuspense>,
  },
  {
    path: "/security",
    element: <PageSuspense><SecurityPage /></PageSuspense>,
  },

  // ── Auth (public-only: redirect to /home if already logged in) ────────────
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: <PageSuspense><LoginPage /></PageSuspense>,
      },
      {
        path: "/register",
        element: <PageSuspense><RegisterPage /></PageSuspense>,
      },
      {
        path: "/forgot-password",
        element: <PageSuspense><ForgotPasswordPage /></PageSuspense>,
      },
    ],
  },

  // ── Session expired (public) ──────────────────────────────────────────────
  {
    path: "/session-expired",
    element: <PageSuspense><SessionExpiredPage /></PageSuspense>,
  },

  // ── Auth callback (público; conclui OIDC/OAuth antes da sessão existir) ────
  {
    path: "/auth/callback",
    element: <PageSuspense><AuthCallbackPage /></PageSuspense>,
  },

  // ── Redefinição de senha (público pelo mesmo motivo do callback) ───────────
  // O usuário chega aqui pelo link do e-mail do Supabase, com um token de recuperação e
  // SEM sessão. `PublicOnlyRoute` não serve: ele redireciona quem já está logado, e a
  // recuperação também precisa funcionar para quem tem sessão velha no navegador.
  //
  // Esta rota não existia. `ForgotPasswordPage` mandava o link, `authFlow` sabia montar a
  // URL, a página estava escrita — e o router não a registrava, então o usuário caía num
  // 404 vindo do e-mail. Ela vivia em `src_legacy/App.tsx`, o router ANTIGO, e a migração
  // da Onda 6 não a portou; a remoção do legado na Onda 8 não causou a falha, apenas
  // tirou da árvore o arquivo que dava a impressão de que o caso estava coberto.
  {
    path: "/auth/reset-password",
    element: <PageSuspense><ResetPasswordPage /></PageSuspense>,
  },

  // ── Protected routes ──────────────────────────────────────────────────────
  //
  // `FundacaoV1` fica ENTRE o portao de autenticacao e as telas: toda tela autenticada pode ler
  // `/v1`, inclusive as legadas ja migradas. Ver src/app/FundacaoV1.tsx.
  {
    element: <ProtectedRoute />,
    children: [{
    element: <FundacaoV1 />,
    children: [
      // Launchpad — primary entry for authenticated users
      { path: "/home", element: <PageSuspense><LaunchpadPage /></PageSuspense> },
      { path: "/home/welcome", element: <PageSuspense><LaunchpadPage /></PageSuspense> },

      // Profile
      { path: "/profile", element: <PageSuspense><ProfilePage /></PageSuspense> },

      // Workspaces
      { path: "/workspaces", element: <PageSuspense><WorkspacesPage /></PageSuspense> },

      // History (accessible without an active analysis)
      { path: "/dashboard/history", element: <PageSuspense><HistoryPage /></PageSuspense> },
      // Deep link legado do detalhe. Nada navega mais para ca desde a migracao do historico
      // (4A/3): a linha leva direto a rota canonica. O redirect existe para que URLs salvas e
      // compartilhadas continuem funcionando -- e leva ao renderizador CANONICO, que le o
      // documento `analysis-result-v1`. Reconstruir um segundo renderizador do mesmo documento
      // seria duplicar a `CanonicalResultPage` com semantica legada.
      { path: "/dashboard/history/:id", element: <RedirecionaDetalheLegado /> },

      // Settings
      { path: "/dashboard/settings", element: <PageSuspense><SettingsPage /></PageSuspense> },

      // Canonical analysis journey (Onda 6) — flag-gated layout; legacy routes untouched when OFF
      {
        element: <PageSuspense><CanonicalAnalysisLayout /></PageSuspense>,
        children: [
          { path: "/canonical/analyses", element: <PageSuspense><CanonicalAnalysesList /></PageSuspense> },
          { path: "/canonical/analyses/new", element: <PageSuspense><CanonicalStartPage /></PageSuspense> },
          { path: "/canonical/analyses/:analysisId", element: <PageSuspense><CanonicalAnalysisPage /></PageSuspense> },
          { path: "/canonical/analyses/:analysisId/result", element: <PageSuspense><CanonicalResultPage /></PageSuspense> },
        ],
      },

      // `/dashboard` — COMPATIBILIDADE. Resolve a análise canônica no backend e redireciona.
      // Sem portão de "análise completa": a própria rota decide entre redirecionar e mostrar
      // estado vazio, e nenhum indicador é renderizado aqui.
      { path: "/dashboard", element: <PageSuspense><DashboardCompatRoute /></PageSuspense> },
      { path: "/dashboard/analysis", element: <Navigate to="/dashboard" replace /> },
      // Os 3 painéis com rota própria foram aposentados junto com o cluster legado.
      { path: "/dashboard/diagnostics", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard/guardrails", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard/optimization", element: <Navigate to="/dashboard" replace /> },
    ],
    }],
  },

  // ── Legacy redirect aliases ────────────────────────────────────────────────
  { path: "/manage-context", element: <Navigate to="/workspaces" replace /> },
  { path: "/dashboard/workspaces", element: <Navigate to="/workspaces" replace /> },
  { path: "/dashboard/manage-context", element: <Navigate to="/workspaces" replace /> },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: "/error", element: <PageSuspense><ServerErrorPage /></PageSuspense> },
  { path: "*", element: <PageSuspense><NotFoundPage /></PageSuspense> },
];

export const router = createBrowserRouter(routes);
