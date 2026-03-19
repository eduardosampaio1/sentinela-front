import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const HomePage = lazy(() => import("./pages/HomePage"));
const HomeWelcomePage = lazy(() => import("./pages/HomeWelcomePage"));
const HomeDeepPage = lazy(() => import("./pages/HomeDeepPage"));
const QuickScanStandalonePage = lazy(() => import("./pages/QuickScanStandalonePage"));
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const ArgosObservabilityPage = lazy(() => import("./pages/ArgosObservabilityPage"));
const EstixeGuardrailsPage = lazy(() => import("./pages/EstixeGuardrailsPage"));
const NomosDiagnosticsPage = lazy(() => import("./pages/NomosDiagnosticsPage"));
const MetisIntelligencePage = lazy(() => import("./pages/MetisIntelligencePage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const WorkspacesPage = lazy(() => import("./pages/WorkspacesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const AnalysisCompletedRoute = lazy(() => import("./components/AnalysisCompletedRoute"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home/welcome"
              element={
                <ProtectedRoute>
                  <HomeWelcomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home/deep"
              element={
                <ProtectedRoute>
                  <HomeDeepPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/:projectsSlug/:workspaceSlug"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quick-scan"
              element={
                <ProtectedRoute>
                  <QuickScanStandalonePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <ProtectedRoute>
                  <WorkspacesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-context"
              element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AnalysisCompletedRoute>
                    <DashboardLayout />
                  </AnalysisCompletedRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="quick-scan" element={<Navigate to="/quick-scan" replace />} />
              <Route path="analysis" element={<ArgosObservabilityPage />} />
              <Route path="guardrails" element={<EstixeGuardrailsPage />} />
              <Route path="diagnostics" element={<NomosDiagnosticsPage />} />
              <Route path="optimization" element={<MetisIntelligencePage />} />
              <Route path="argos" element={<Navigate to="/dashboard/analysis" replace />} />
              <Route path="estixe" element={<Navigate to="/dashboard/guardrails" replace />} />
              <Route path="nomos" element={<Navigate to="/dashboard/diagnostics" replace />} />
              <Route path="metis" element={<Navigate to="/dashboard/optimization" replace />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="workspaces" element={<Navigate to="/workspaces" replace />} />
              <Route path="manage-context" element={<Navigate to="/workspaces" replace />} />
              <Route path="conversations" element={<Navigate to="/dashboard/analysis" replace />} />
              <Route path="intents" element={<Navigate to="/dashboard/diagnostics" replace />} />
              <Route path="metrics" element={<Navigate to="/dashboard/analysis" replace />} />
              <Route path="alerts" element={<Navigate to="/dashboard/guardrails" replace />} />
              <Route path="reports" element={<Navigate to="/dashboard/optimization" replace />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
