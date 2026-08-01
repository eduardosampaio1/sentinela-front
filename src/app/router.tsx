import { lazy, Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  type RouteObject,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";
import { LoadingState } from "@/shared/states/LoadingState";

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
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const LaunchpadPage = lazy(() =>
  import("@/features/launchpad/LaunchpadPage").then((m) => ({ default: m.LaunchpadPage }))
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const HistoryPage = lazy(() =>
  import("@/features/history/HistoryPage").then((m) => ({ default: m.HistoryPage }))
);
const RunDetailPage = lazy(() =>
  import("@/features/history/RunDetailPage").then((m) => ({ default: m.RunDetailPage }))
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

// Dashboard sub-panels (route-accessible deep views)
const DiagnosticsPanel = lazy(() =>
  import("@/features/dashboard/technical/DiagnosticsPanel").then((m) => ({
    default: function DiagnosticsPanelPage() {
      return (
        <div className="min-h-screen bg-[#070C18] p-8">
          <m.DiagnosticsPanel />
        </div>
      );
    },
  }))
);
const GuardrailsPanel = lazy(() =>
  import("@/features/dashboard/technical/GuardrailsPanel").then((m) => ({
    default: function GuardrailsPanelPage() {
      return (
        <div className="min-h-screen bg-[#070C18] p-8">
          <m.GuardrailsPanel />
        </div>
      );
    },
  }))
);
const OptimizationPanel = lazy(() =>
  import("@/features/dashboard/technical/OptimizationPanel").then((m) => ({
    default: function OptimizationPanelPage() {
      return (
        <div className="min-h-screen bg-[#070C18] p-8">
          <m.OptimizationPanel />
        </div>
      );
    },
  }))
);

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

function AnalysisCompletedRoute() {
  const { analysisCompleted, historyResolved } = useAnalysis();

  if (!historyResolved) {
    return <FullScreenLoader message="Restoring analysis context" />;
  }

  if (!analysisCompleted) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

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
  {
    element: <ProtectedRoute />,
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
      { path: "/dashboard/history/:id", element: <PageSuspense><RunDetailPage /></PageSuspense> },

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

      // Dashboard — requires an active analysis to be loaded
      {
        element: <AnalysisCompletedRoute />,
        children: [
          { path: "/dashboard", element: <PageSuspense><DashboardPage /></PageSuspense> },
          { path: "/dashboard/analysis", element: <PageSuspense><DashboardPage /></PageSuspense> },
          { path: "/dashboard/diagnostics", element: <PageSuspense><DiagnosticsPanel /></PageSuspense> },
          { path: "/dashboard/guardrails", element: <PageSuspense><GuardrailsPanel /></PageSuspense> },
          { path: "/dashboard/optimization", element: <PageSuspense><OptimizationPanel /></PageSuspense> },
        ],
      },
    ],
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
