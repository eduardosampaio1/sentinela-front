import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isSessionCached,
  loadResult,
  saveResult,
  type AnalysisResult,
} from "@/lib/api";
import { getV1Client } from "@/lib/v1/defaultClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * `hasHistory` pergunta ao backend, não ao Supabase.
 *
 * Este contexto é montado em `app/providers.tsx`, ACIMA do router — a `FundacaoV1` é elemento de
 * rota e portanto fica abaixo dele. Usar `useV1Client()` aqui reintroduziria, invertido, o
 * defeito corrigido na Macrofrente 1: hook exigindo um provider que não existe acima.
 *
 * `getV1Client()` devolve o MESMO singleton que a `CanonicalClientProvider` entrega — sem
 * segundo cliente e sem depender do contexto React.
 *
 * Escopo: só `workspace_id`. O eixo (workspace, project, environment) saiu; a autoridade de
 * tenant é o workspace autenticado.
 */
async function workspaceTemAnalise(workspaceId: string): Promise<boolean> {
  const pagina = await getV1Client().list({ workspaceId, limit: 1 });
  return (pagina.items?.length ?? 0) > 0;
}

// Sprint 5: stage → progress mapping (never fake percentages)
interface AnalysisContextValue {
  result: AnalysisResult | null;
  hasHistory: boolean;
  analysisCompleted: boolean;
  historyResolved: boolean;
  dataSource: "cached" | "fresh";
  clearAnalysis: () => void;
  loadStoredAnalysis: (analysis: AnalysisResult) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function conversationsToJsonl(conversations: unknown[]) {
  return conversations.map((item) => JSON.stringify(item)).join("\n");
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [historyResolved, setHistoryResolved] = useState(false);
  const [dataSource, setDataSource] = useState<"cached" | "fresh">("fresh");
  // `activeJob` saiu junto: o tipo vinha de `lib/analysisJobs` (camada Supabase) e nenhuma
  // tela consumia o campo -- era estado publicado sem leitor.

  const { toast } = useToast();
  const { user, workspace, project, environment } = useAuth();
  // Eixo unico: o workspace autenticado. `project`/`environment` sairam do escopo de
  // historico e de cache -- eles nunca foram autoridade de tenant, e enquanto compunham a
  // chave o mesmo workspace via historicos diferentes conforme a selecao do usuario.
  const historyStorageKey = workspace?.id ? `sentinela:history:${workspace.id}` : null;
  const contextScope = useMemo(
    () => ({
      workspaceId: workspace?.id ?? null,
      projectId: null,
      environmentId: null,
    }),
    [workspace?.id],
  );

  const markHasHistory = useCallback(() => {
    setHasHistory(true);
    if (historyStorageKey) {
      window.localStorage.setItem(historyStorageKey, "1");
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (!workspace?.id) {
      setHasHistory(false);
      setResult(null);
      setDataSource("fresh");
      setHistoryResolved(true);
      return;
    }

    setHistoryResolved(false);
    setHasHistory(false);
    setResult(null);
    setDataSource("fresh");

    const storageKey = `sentinela:history:${workspace.id}`;
    const localFlag = window.localStorage.getItem(storageKey) === "1";
    const cachedWorkspaceResult = loadResult(contextScope);
    const hasScopedSessionCache = isSessionCached(contextScope);
    if (cachedWorkspaceResult && hasScopedSessionCache) {
      setResult(cachedWorkspaceResult);
      setDataSource("cached");
      setHasHistory(true);
    }
    if (localFlag) {
      setHasHistory(true);
    }

    let mounted = true;

    // A verdade navegacional — "este workspace já tem análise?" — vem do backend canônico.
    //
    // O que NÃO é restaurado daqui é o `result` legado (forma `AnalysisResult`, produzida pelo
    // `/api/analyze`). Ele não tem produtor canônico: `analysis-result-v1` é outro contrato, com
    // renderizador próprio (`CanonicalResultPage`). Mapear um no outro construiria um segundo
    // renderizador do mesmo documento — recusado antes no `RunDetailPage`, e recusado aqui.
    //
    // Sem cache de sessão, `result` fica nulo e a tela diz isso, em vez de o navegador
    // reconstruir um registro que ele não deveria ter criado. Para reabrir um resultado, o
    // caminho é o histórico → `/canonical/analyses/{id}/result`.
    void workspaceTemAnalise(workspace.id)
      .then((existe) => {
        if (!mounted) return;
        if (existe) {
          setHasHistory(true);
          window.localStorage.setItem(storageKey, "1");
        } else if (!localFlag && !hasScopedSessionCache) {
          setHasHistory(false);
          setResult(null);
          setDataSource("fresh");
        }
        setHistoryResolved(true);
      })
      .catch((error) => {
        console.error(error);
        if (mounted) {
          setHistoryResolved(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [contextScope, workspace?.id]);

  // AQUI FICAVA O CAMINHO INLINE: `runAnalysis`, `handleRerun`, `handleFileUpload` e
  // `handlePasteAnalysis`, mais o maquinario de progresso (`loading`, `loadingStep`,
  // `loadingProgress`, `jobStage*`, `executionProfile`, `finishLoading`).
  //
  // Todos falavam com `/api/analyze`, que o Gateway recusa sem project_id +
  // environment_id. Esse eixo perdeu dono quando a identidade virou workspace-only, e dar
  // a ele uma fonte propria seria persistencia paralela sem dono arquitetural.
  //
  // A entrada de analise agora e a jornada canonica: o Launchpad e o Re-run navegam para
  // /canonical/analyses/new, onde prepare -> upload -> submit acontece com o Orchestrator
  // como dono do registro. Zero consumidores restantes provados por grep, por
  // desestruturacao, por alias, em mocks, em testes, e pelo sourcemap do build.

  // AQUI FICAVA `importAnalysisResult`.
  //
  // Fluxo INALCANCAVEL: nenhuma tela consumia a acao -- so o proprio contexto a exportava.
  // E era o caso mais direto do que a matriz proibe: o proprio codigo dizia "unica
  // persistencia deste fluxo: nao passa pelo backend", com `requirePersistence: true`.
  // O navegador criava um registro de analise que nenhum backend conhecia.
  //
  // Removida inteira em vez de migrada: migrar uma acao morta seria trabalho sobre codigo
  // que ninguem alcanca, e daria a um fluxo sem dono um endpoint novo.

  const clearAnalysis = useCallback(() => {
    setResult(null);
    setDataSource("fresh");
  }, []);

  const loadStoredAnalysis = useCallback((analysis: AnalysisResult) => {
    saveResult(analysis, undefined, contextScope);
    setResult(analysis);
    setDataSource("cached");
    markHasHistory();
  }, [contextScope, markHasHistory]);

  const value = useMemo(
    () => ({
      result,
      hasHistory,
      analysisCompleted: hasHistory || Boolean(result),
      historyResolved,
      dataSource,
      clearAnalysis,
      loadStoredAnalysis,
    }),
    [
      result,
      hasHistory,
      historyResolved,
      dataSource,
      clearAnalysis,
      loadStoredAnalysis,
    ]
  );

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within AnalysisProvider");
  }
  return context;
}
