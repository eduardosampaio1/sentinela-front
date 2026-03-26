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
  analyzeConversations,
  hashDataset,
  isSessionCached,
  loadResult,
  parseAnalysisImport,
  parseConversationsInput,
  saveResult,
  type AnalysisResult,
} from "@/lib/api";
import { saveAnalysisRun, getLatestAnalysisRun } from "@/lib/analysisRuns";
import { type AnalysisJobRecord } from "@/lib/analysisJobs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ANALYSIS_STAGES = [
  "Uploading dataset",
  "Creating analysis job",
  "Queueing request",
  "Waiting for worker",
];

interface AnalysisContextValue {
  result: AnalysisResult | null;
  hasHistory: boolean;
  analysisCompleted: boolean;
  historyResolved: boolean;
  dataSource: "cached" | "fresh";
  loading: boolean;
  loadingMessage: string;
  loadingStep: number;
  loadingProgress: number;
  runAnalysis: (conversations: unknown[]) => Promise<void>;
  handleRerun: () => void;
  handleFileUpload: (file: File) => void;
  handlePasteAnalysis: (text: string) => void;
  importAnalysisResult: (text: string) => void;
  clearAnalysis: () => void;
  loadStoredAnalysis: (analysis: AnalysisResult) => void;
  activeJob: AnalysisJobRecord | null;
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

function toPersistableResult(result: AnalysisResult): Record<string, unknown> {
  return JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [historyResolved, setHistoryResolved] = useState(false);
  const [dataSource, setDataSource] = useState<"cached" | "fresh">("fresh");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeJob, setActiveJob] = useState<AnalysisJobRecord | null>(null);

  const lastConversationsRef = useRef<unknown[] | null>(null);

  const { toast } = useToast();
  const { user, workspace, project, environment } = useAuth();
  const historyStorageKey =
    workspace?.id && project?.id && environment?.id
      ? `sentinela:history:${workspace.id}:${project.id}:${environment.id}`
      : null;
  const contextScope = useMemo(
    () => ({
      workspaceId: workspace?.id ?? null,
      projectId: project?.id ?? null,
      environmentId: environment?.id ?? null,
    }),
    [environment?.id, project?.id, workspace?.id],
  );

  const markHasHistory = useCallback(() => {
    setHasHistory(true);
    if (historyStorageKey) {
      window.localStorage.setItem(historyStorageKey, "1");
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (!loading) return undefined;

    setLoadingStep(0);
    setLoadingProgress(10);

    const interval = window.setInterval(() => {
      setLoadingStep((current) =>
        current < ANALYSIS_STAGES.length - 1 ? current + 1 : current
      );
      setLoadingProgress((current) => Math.min(92, current + 18));
    }, 850);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!workspace?.id || !project?.id || !environment?.id) {
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

    const storageKey = `sentinela:history:${workspace.id}:${project.id}:${environment.id}`;
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

    void getLatestAnalysisRun(workspace.id, project.id, environment.id)
      .then((latestRun) => {
        if (!mounted) return;
        if (latestRun) {
          setHasHistory(true);
          window.localStorage.setItem(storageKey, "1");
          if (latestRun.raw_result && typeof latestRun.raw_result === "object") {
            const latestResult = latestRun.raw_result as AnalysisResult;
            saveResult(latestResult, undefined, contextScope);
            setResult(latestResult);
            setDataSource("cached");
          }
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
  }, [contextScope, environment?.id, project?.id, workspace?.id]);

  const finishLoading = useCallback(() => {
    setLoadingProgress(100);

    window.setTimeout(() => {
      setLoading(false);
      setLoadingStep(0);
      setLoadingProgress(0);
    }, 350);
  }, []);

  const runAnalysis = useCallback(
    async (conversations: unknown[]) => {
      if (conversations.length < 2) {
        toast({
          title: "Minimum 2 conversations required",
          variant: "destructive",
        });
        return;
      }

      if (!user?.id || !workspace?.id || !project?.id || !environment?.id) {
        toast({
          title: "Missing workspace context",
          description: "You must be logged in and attached to workspace, system, and environment.",
          variant: "destructive",
        });
        return;
      }

      lastConversationsRef.current = conversations;
      setLoading(true);

      try {
        const apiResult = await analyzeConversations(conversations, {
          workspaceId: workspace.id,
          projectId: project.id,
          environmentId: environment.id,
        });
        const inputHash = await hashDataset(conversationsToJsonl(conversations));

        setResult(apiResult);
        saveResult(apiResult, inputHash, contextScope);
        setDataSource("fresh");
        markHasHistory();
        setActiveJob(null);

        let persistenceError: unknown = null;
        try {
          const savedRun = await saveAnalysisRun({
            workspaceId: workspace.id,
            projectId: project.id,
            environmentId: environment.id,
            createdBy: user.id,
            sourceFilename: "dataset.jsonl",
            inputHash,
            result: toPersistableResult(apiResult),
          });
          if (savedRun?.id) {
            const persistedResult = {
              ...apiResult,
              analysis_run_id: savedRun.id,
            };
            setResult(persistedResult);
            saveResult(persistedResult, inputHash, contextScope);
          }
        } catch (persistError) {
          persistenceError = persistError;
        }

        toast({
          title: "Analysis completed successfully.",
        });
        if (persistenceError) {
          toast({
            title: "History sync failed",
            description: getErrorMessage(persistenceError),
            variant: "destructive",
          });
        }
        finishLoading();
      } catch (error: unknown) {
        finishLoading();
        toast({
          title: "Analysis failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [
      contextScope,
      environment?.id,
      finishLoading,
      markHasHistory,
      project?.id,
      toast,
      user?.id,
      workspace?.id,
    ]
  );

  const handleRerun = useCallback(() => {
    if (lastConversationsRef.current) {
      void runAnalysis(lastConversationsRef.current);
      return;
    }

    toast({
      title: "No dataset loaded",
      description: "Upload or paste a dataset first.",
      variant: "destructive",
    });
  }, [runAnalysis, toast]);

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const text = reader.result as string;
          const conversations = parseConversationsInput(text);
          void runAnalysis(conversations);
        } catch (error: unknown) {
          toast({
            title: "Invalid JSON file",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    },
    [runAnalysis, toast]
  );

  const handlePasteAnalysis = useCallback(
    (text: string) => {
      try {
        const conversations = parseConversationsInput(text);
        void runAnalysis(conversations);
      } catch (error: unknown) {
        toast({
          title: "Invalid dataset JSON",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [runAnalysis, toast]
  );

  const importAnalysisResult = useCallback(
    (text: string) => {
      try {
        setLoading(true);
        const mapped = parseAnalysisImport(text);

        window.setTimeout(async () => {
          try {
            saveResult(mapped, undefined, contextScope);
            setResult(mapped);
            setDataSource("fresh");
            markHasHistory();

            if (user?.id && workspace?.id && project?.id && environment?.id) {
              const inputHash = await hashDataset(JSON.stringify(mapped));

              const savedRun = await saveAnalysisRun({
                workspaceId: workspace.id,
                projectId: project.id,
                environmentId: environment.id,
                createdBy: user.id,
                inputHash,
                result: toPersistableResult(mapped),
              });
              if (savedRun?.id) {
                const persistedResult = {
                  ...mapped,
                  analysis_run_id: savedRun.id,
                };
                saveResult(persistedResult, undefined, contextScope);
                setResult(persistedResult);
              }
            }

            toast({ title: "Analysis result imported" });
          } catch (error: unknown) {
            toast({
              title: "Failed to persist imported analysis",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          } finally {
            finishLoading();
          }
        }, 900);
      } catch (error: unknown) {
        setLoading(false);
        toast({
          title: "Invalid analysis result",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [
      contextScope,
      environment?.id,
      finishLoading,
      markHasHistory,
      project?.id,
      toast,
      user?.id,
      workspace?.id,
    ]
  );

  const clearAnalysis = useCallback(() => {
    setResult(null);
    setDataSource("fresh");
    setActiveJob(null);
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
      loading,
      loadingMessage: ANALYSIS_STAGES[loadingStep] ?? ANALYSIS_STAGES[0],
      loadingStep,
      loadingProgress,
      runAnalysis,
      handleRerun,
      handleFileUpload,
      handlePasteAnalysis,
      importAnalysisResult,
      clearAnalysis,
      loadStoredAnalysis,
      activeJob,
    }),
    [
      result,
      hasHistory,
      historyResolved,
      dataSource,
      loading,
      loadingStep,
      loadingProgress,
      runAnalysis,
      handleRerun,
      handleFileUpload,
      handlePasteAnalysis,
      importAnalysisResult,
      clearAnalysis,
      loadStoredAnalysis,
      activeJob,
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
