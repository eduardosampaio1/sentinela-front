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

// ---- Lazy-loaded pages ----

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
const LaunchpadPage = lazy(() =>
  import("@/features/launchpad/LaunchpadPage").then((m) => ({ default: m.LaunchpadPage }))
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage }))
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
const NotFoundPage = lazy(() =>
  import("@/features/errors/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

// Standalone panel pages (route-accessible sub-panels)
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

// ---- Route guards ----

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
          <LoadingState message="Loading" size="md" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
        <LoadingState message="Verifying session" size="md" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
        <LoadingState message="Loading" size="md" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function AnalysisCompletedRoute() {
  const { analysisCompleted, historyResolved } = useAnalysis();

  if (!historyResolved) {
    return (
      <div className="min-h-screen bg-[#070C18] flex items-center justify-center">
        <LoadingState message="Loading analysis" size="md" />
      </div>
    );
  }

  if (!analysisCompleted) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

// ---- Router configuration ----

const routes: RouteObject[] = [
  // Public landing
  {
    path: "/",
    element: <PageSuspense><LandingPage /></PageSuspense>,
  },

  // Public auth routes (redirect to /home if already logged in)
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

  // Session expired (public)
  {
    path: "/session-expired",
    element: <PageSuspense><SessionExpiredPage /></PageSuspense>,
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      // Launchpad
      {
        path: "/home",
        element: <PageSuspense><LaunchpadPage /></PageSuspense>,
      },
      {
        path: "/home/welcome",
        element: <PageSuspense><LaunchpadPage /></PageSuspense>,
      },

      // Dashboard routes (require analysis)
      {
        element: <AnalysisCompletedRoute />,
        children: [
          {
            path: "/dashboard",
            element: <PageSuspense><DashboardPage /></PageSuspense>,
          },
          {
            path: "/dashboard/analysis",
            element: <PageSuspense><DashboardPage /></PageSuspense>,
          },
          {
            path: "/dashboard/diagnostics",
            element: <PageSuspense><DiagnosticsPanel /></PageSuspense>,
          },
          {
            path: "/dashboard/guardrails",
            element: <PageSuspense><GuardrailsPanel /></PageSuspense>,
          },
          {
            path: "/dashboard/optimization",
            element: <PageSuspense><OptimizationPanel /></PageSuspense>,
          },
        ],
      },

      // History (accessible without analysis)
      {
        path: "/dashboard/history",
        element: <PageSuspense><HistoryPage /></PageSuspense>,
      },

      // Settings
      {
        path: "/dashboard/settings",
        element: <PageSuspense><SettingsPage /></PageSuspense>,
      },

      // Workspaces
      {
        path: "/workspaces",
        element: <PageSuspense><WorkspacesPage /></PageSuspense>,
      },
    ],
  },

  // 404
  {
    path: "*",
    element: <PageSuspense><NotFoundPage /></PageSuspense>,
  },
];

export const router = createBrowserRouter(routes);
