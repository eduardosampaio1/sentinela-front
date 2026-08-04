import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAuth } from "@/hooks/useAuth";
import { AnalysisLauncher } from "./AnalysisLauncher";
import { RecentRuns } from "./RecentRuns";
import { Button } from "@/components/ui/button";

// ─── Active context strip ────────────────────────────────────────────────────

function ContextStrip() {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  // Contexto ativo = workspace autenticado. `project`/`environment` sairam da identidade junto
  // com o caminho de analise inline que os exigia; nao havia "contexto incompleto" a sinalizar
  // aqui, porque so existe um eixo agora.
  if (!workspace) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3 rounded-xl border mb-6 bg-[#0D1525] border-[rgba(255,255,255,0.06)]">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#475569] mb-0.5">
          Workspace
        </p>
        <p className="text-sm font-semibold text-[#F1F5F9] truncate">{workspace.name}</p>
      </div>

      <Button
        onClick={() => navigate("/workspaces")}
        variant="ghost"
        size="sm"
        className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] flex-shrink-0 ml-4"
      >
        Change
      </Button>
    </div>
  );
}

// ─── LaunchpadPage ─────────────────────────────────────────────────────────────

export function LaunchpadPage() {
  // `navigate` estava declarado APENAS dentro de `ContextStrip`, e usado aqui embaixo no
  // botao "View last results" -- fora do escopo. Em runtime isso e `ReferenceError` no
  // clique, numa pagina viva. Invisivel porque `features/launchpad` estava fora do alcance
  // do `npm run typecheck`.
  const navigate = useNavigate();

  // O vigia do ciclo `loading` (true -> false -> navega para /dashboard) sumiu junto com o
  // caminho inline: sem execucao aqui, nao ha ciclo para observar. A jornada canonica leva
  // o usuario a identidade duravel por conta propria.

  return (
    <>
      <AppShell topBarTitle="Launchpad">
        <PageFrame maxWidth="xl">

          {/* Context confirmation */}
          <ContextStrip />

          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#F1F5F9] mb-1.5">
                  Analyze your AI system
                </h1>
                <p className="text-sm text-[#94A3B8] leading-relaxed max-w-xl">
                  Upload a conversation dataset to produce a full diagnostic report —
                  behavior score, risk classification, economic impact, and prioritized
                  recommendations. Results are saved to your workspace history.
                </p>
              </div>

              {/* SEM condicional. `analysisCompleted` era `hasHistory || Boolean(result)`
                  — autorização indireta que errava nos dois sentidos: escondia o botão
                  de quem tinha resultado e o mostrava para quem não tinha.

                  `/dashboard` é rota de compatibilidade: ela pergunta ao backend e
                  decide entre abrir o resultado e mostrar o estado vazio. O botão pode
                  aparecer sempre porque quem responde "tem ou não tem" é o backend. */}
              {(
                <Button
                  onClick={() => navigate("/dashboard")}
                  size="sm"
                  className="rounded-xl bg-[rgba(79,90,232,0.10)] text-[#4F5AE8] border border-[rgba(79,90,232,0.18)] hover:bg-[rgba(79,90,232,0.16)] flex-shrink-0"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                  View last results
                </Button>
              )}
            </div>
          </div>

          {/* Main layout */}
          <div className="space-y-6">
            <AnalysisLauncher />
            <RecentRuns maxRuns={5} />
          </div>

          {/* Format guidance */}
          <div className="mt-8 flex items-start gap-3 px-5 py-4 rounded-xl bg-[rgba(79,90,232,0.04)] border border-[rgba(79,90,232,0.08)]">
            <svg className="w-4 h-4 text-[#4F5AE8] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-[#4F5AE8] mb-1">Dataset format</p>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Accepts <span className="text-[#94A3B8] font-mono">.json</span> or{" "}
                <span className="text-[#94A3B8] font-mono">.jsonl</span> files containing conversation records.
                Each record must include user and assistant turns. A minimum of 2 conversations
                is required for statistical validity. Larger datasets produce more reliable scores.
              </p>
            </div>
          </div>

        </PageFrame>
      </AppShell>
    </>
  );
}
