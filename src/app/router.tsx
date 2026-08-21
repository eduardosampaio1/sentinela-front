import { lazy, Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
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
// M32 — `/home` deixou de servir o `LaunchpadPage` legado. HOME-01 e a composicao do Blueprint
// D9/§4.3; o que havia ali (behavior score, launcher inline, dataset format, CTA para
// `/dashboard`) nao pertence a esta superficie e saiu por decisao de owner.
const HomePage = lazy(() =>
  import("@/features/home/HomePage").then((m) => ({ default: m.HomePage }))
);
// `/dashboard` NÃO é mais um dashboard: é rota de compatibilidade que resolve a análise
// canônica no backend e redireciona para o renderizador único.
const DashboardCompatRoute = lazy(() =>
  import("@/features/dashboard/DashboardCompatRoute").then((m) => ({ default: m.DashboardCompatRoute }))
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

// ── Jornada canônica /v1 ────────────────────────────────────────────────────────────────────────
/**
 * `/canonical/*` -> a mesma rota sem o prefixo.
 *
 * `canonical` era nome de camada INTERNA, e vazou para a URL que a pessoa lê, guarda nos favoritos
 * e cola em e-mail. A decisão A10 tirou isso da IA pública. O que não pode acontecer é a URL antiga
 * dar 404: link em e-mail já enviado e favorito continuam existindo no mundo, e esse defeito só
 * aparece para quem não está por perto para reclamar.
 *
 * `search` e `hash` viajam junto de propósito. `#comparison` é âncora contratada — um redirect que
 * a descartasse levaria a pessoa à página certa e ao lugar errado dela, o que é pior que 404
 * porque parece ter funcionado. `replace` para que o botão voltar não repique na URL aposentada.
 */
function RedirecionaCanonicoLegado() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={pathname.replace(/^\/canonical/, "") + search + hash} replace />;
}

/**
 * `/dashboard/history/:id` -> `/analyses/:id/result`.
 *
 * Preserva deep links antigos (favorito, link compartilhado) sem manter uma segunda tela de
 * resultado. `replace` para que o botao voltar nao caia no redirect de novo.
 */
function RedirecionaDetalheLegado() {
  const { id } = useParams();
  if (!id) return <Navigate to="/analyses" replace />;
  return <Navigate to={`/analyses/${encodeURIComponent(id)}/result`} replace />;
}

const CanonicalAnalysisLayout = lazy(() =>
  import("@/features/canonical-analysis/ui/CanonicalAnalysisLayout").then((m) => ({ default: m.CanonicalAnalysisLayout }))
);
const InstancesList = lazy(() => import("@/features/instances/InstancesListPage"));
const InstanceDetail = lazy(() => import("@/features/instances/InstancePage"));
const CanonicalAnalysesList = lazy(() =>
  import("@/features/canonical-analysis/ui/AnalysesListPage").then((m) => ({ default: m.AnalysesListPage }))
);
// M39 · EVO-02. Os DOIS ids no caminho: a comparação é reconstruível pelo endereço, sem query
// param, sem storage e sem navigation state. A ordem A/B é a da rota.
const CanonicalComparePage = lazy(() =>
  import("@/features/canonical-analysis/ui/CompareAnalysesPage").then((m) => ({ default: m.CompareAnalysesPage })),
);
const CanonicalStartPage = lazy(() =>
  import("@/features/canonical-analysis/ui/StartAnalysisPage").then((m) => ({ default: m.StartAnalysisPage }))
);
const CanonicalAnalysisPage = lazy(() =>
  import("@/features/canonical-analysis/ui/AnalysisPage").then((m) => ({ default: m.AnalysisPage }))
);
// F3: a visão ARGOS em chunk próprio. Ela só é buscada quando alguém pede o ARGOS — e o
// documento que ela lê (`analysis-result-v3`) é maior que o v1, então carregá-la junto da
// jornada cobraria o custo de quem nunca abriu a visão.
const CanonicalArgosView = lazy(() =>
  import("@/features/canonical-analysis/ui/argos/ArgosView").then((m) => ({ default: m.ArgosView }))
);
// F4: a visão Analytics em chunk próprio, pelo mesmo motivo — quem abre o ARGOS não paga por ela.
const CanonicalAnalyticsView = lazy(() =>
  import("@/features/canonical-analysis/ui/analytics/AnalyticsView").then((m) => ({ default: m.AnalyticsView }))
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
  const { user, loading, memberships, membershipsLoading, membershipsError } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (user) {
    // O destino depende de haver workspace, e por isso ESPERA a projecao de identidade.
    //
    // `/home` inteira e sobre o que existe DENTRO de um workspace: `useCanonicalScope()`
    // devolve `null` sem um selecionado, e as tres regioes da tela dependem dele. Mandar para
    // la quem nao tem nenhum entrega uma pagina cujo conteudo inteiro depende do que falta --
    // e o caminho para resolver isso nao esta em lugar nenhum dela.
    if (membershipsLoading) {
      return <FullScreenLoader />;
    }

    // Falha de projecao NAO e "voce nao tem workspaces". Sao estados diferentes, e tratar o
    // primeiro como o segundo mandaria alguem com espacos criar mais um por causa de uma
    // indisponibilidade. Na duvida, o destino de sempre -- e a propria `/home` sabe se
    // apresentar quando o escopo nao resolve.
    if (!membershipsError && memberships.length === 0) {
      return <Navigate to="/workspaces" replace />;
    }

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
      { path: "/home", element: <PageSuspense><HomePage /></PageSuspense> },
      // `/home/welcome` renderizava a MESMA `LaunchpadPage` que `/home`, e nenhuma navegação
      // apontava para ela: duas rotas públicas para a mesma tela, sem diferença. A duplicata sai
      // como DESTINO — mas não vira 404, porque ela existiu e pode estar em favorito de alguém.
      { path: "/home/welcome", element: <Navigate to="/home" replace /> },

      // Profile
      { path: "/profile", element: <PageSuspense><ProfilePage /></PageSuspense> },

      // Workspaces
      { path: "/workspaces", element: <PageSuspense><WorkspacesPage /></PageSuspense> },

      // M38 · EVO-01. `/dashboard/history` era a SEGUNDA implementação do histórico: uma página
      // própria, com estados próprios, lendo o mesmo `GET /v1/analyses` que a rota canônica já
      // lia. O Discovery registrou a duplicidade desde a Etapa 0; a M38 a encerra em vez de
      // manter duas telas que envelhecem separadas. A rota sobrevive só como compatibilidade,
      // para URLs salvas e compartilhadas — mesmo mecanismo do detalhe legado logo abaixo.
      { path: "/dashboard/history", element: <Navigate to="/analyses" replace /> },
      // Deep link legado do detalhe. Nada navega mais para ca desde a migracao do historico
      // (4A/3): a linha leva direto a rota canonica. O redirect existe para que URLs salvas e
      // compartilhadas continuem funcionando -- e leva ao renderizador CANONICO, que le o
      // documento `analysis-result-v1`. Reconstruir um segundo renderizador do mesmo documento
      // seria duplicar a `CanonicalResultPage` com semantica legada.
      { path: "/dashboard/history/:id", element: <RedirecionaDetalheLegado /> },

      // Instância (M36). O endereço é o que o Blueprint já congelava como IA pública —
      // `/instances/{id}` — e a forma segue a convenção de `/analyses`: recurso no plural, com
      // a identidade DURÁVEL no path. É por ela que deep link e refresh reconstroem o contexto;
      // nada da Instância vem de estado de navegação.
      { path: "/instances", element: <PageSuspense><InstancesList /></PageSuspense> },
      { path: "/instances/:instanceId", element: <PageSuspense><InstanceDetail /></PageSuspense> },

      // Settings
      { path: "/dashboard/settings", element: <PageSuspense><SettingsPage /></PageSuspense> },

      // A jornada de análise, na IA pública. Estes são os endereços que a pessoa vê.
      {
        element: <PageSuspense><CanonicalAnalysisLayout /></PageSuspense>,
        children: [
          { path: "/analyses", element: <PageSuspense><CanonicalAnalysesList /></PageSuspense> },
          { path: "/analyses/new", element: <PageSuspense><CanonicalStartPage /></PageSuspense> },
          {
            path: "/analyses/compare/:analysisAId/:analysisBId",
            element: <PageSuspense><CanonicalComparePage /></PageSuspense>,
          },
          { path: "/analyses/:analysisId", element: <PageSuspense><CanonicalAnalysisPage /></PageSuspense> },
          // ONE ANALYSIS -> TWO VIEWS. Subrotas IRMAS, nunca abas: o produto nao possui o
          // pattern, e a subrota entrega deep link por visao, refresh na visao certa e
          // historico do navegador — que a aba perderia.
          { path: "/analyses/:analysisId/argos", element: <PageSuspense><CanonicalArgosView /></PageSuspense> },
          { path: "/analyses/:analysisId/analytics", element: <PageSuspense><CanonicalAnalyticsView /></PageSuspense> },
          // LEGACY COMPATIBILITY. Nasceu quando havia UM documento de resultado com o
          // analytics embutido; o `analysis-result-v3` desfez a fusao e a experiencia passou
          // a ter duas visoes. Esta rota continua funcionando para todo link ja salvo e NAO
          // recebe feature nova. Nao vira ARGOS-only nem ganha redirect: um link que hoje
          // abre indicadores + bloco analitico passaria a mostrar outra coisa em silencio,
          // que e o oposto de compatibilidade. A aposentadoria e decisao posterior.
          { path: "/analyses/:analysisId/result", element: <PageSuspense><CanonicalResultPage /></PageSuspense> },
        ],
      },

      // COMPATIBILIDADE, e só. `/canonical/*` recebe quem chega de um link antigo e devolve para o
      // endereço público. Nenhuma navegação nova pode GERAR estas rotas — é o que o gate da M24
      // prova, varrendo `to=`, `navigate(` e `href=` em todo o `src/`.
      { path: "/canonical/analyses", element: <RedirecionaCanonicoLegado /> },
      { path: "/canonical/analyses/*", element: <RedirecionaCanonicoLegado /> },

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
