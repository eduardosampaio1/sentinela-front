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
  hashDataset,
  isSessionCached,
  loadResult,
  parseAnalysisImport,
  parseConversationsInput,
  saveResult,
  type AnalysisResult,
} from "@/lib/api";
import { saveAnalysisRun, getAnalysisRunById, getLatestAnalysisRun } from "@/lib/analysisRuns";
import {
  createAnalysisJob,
  uploadDatasetToStorage,
  getAnalysisJobById,
  type AnalysisJobRecord,
} from "@/lib/analysisJobs";
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

function buildDatasetFile(conversations: unknown[], filename = "dataset.jsonl") {
  const jsonl = conversationsToJsonl(conversations);
  return new File([jsonl], filename, {
    type: "application/x-ndjson",
  });
}

function toPersistableResult(result: AnalysisResult): Record<string, unknown> {
  return JSON.parse(JSON.stringify(result)) as Record<string, unknown>;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [dataSource, setDataSource] = useState<"cached" | "fresh">("fresh");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeJob, setActiveJob] = useState<AnalysisJobRecord | null>(null);

  const lastConversationsRef = useRef<unknown[] | null>(null);

  const { toast } = useToast();
  const { user, workspace } = useAuth();
  const historyStorageKey = workspace?.id ? `sentinela:history:${workspace.id}` : null;

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
    const cached = loadResult();
    if (cached && isSessionCached()) {
      setResult(cached);
      setDataSource("cached");
      setHasHistory(true);
    }
  }, []);

  useEffect(() => {
    if (!workspace?.id) {
      setHasHistory(false);
      return;
    }

    const storageKey = `sentinela:history:${workspace.id}`;
    const localFlag = window.localStorage.getItem(storageKey) === "1";
    if (localFlag) {
      setHasHistory(true);
    }

    let mounted = true;

    void getLatestAnalysisRun(workspace.id)
      .then((latestRun) => {
        if (!mounted) return;
        if (latestRun) {
          setHasHistory(true);
          window.localStorage.setItem(storageKey, "1");
        } else if (!localFlag) {
          setHasHistory(false);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      mounted = false;
    };
  }, [workspace?.id]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const job = await getAnalysisJobById(jobId);
        
        if (!job) return;

        if (job.status === "running") {
          setLoadingStep(3);
        }

        if (job.status === "completed" && job.analysis_run_id) {
          clearInterval(intervalId);
          const run = await getAnalysisRunById(job.analysis_run_id);
          
          if (run?.raw_result) {
            const analysisResult = run.raw_result as unknown as AnalysisResult;
            setResult(analysisResult);
            saveResult(analysisResult);
            setDataSource("fresh");
            markHasHistory();
            setLoading(false);
            setActiveJob(null);
            toast({ title: "Análise concluída com sucesso!" });
          }
        }

        if (job.status === "failed") {
          clearInterval(intervalId);
          setLoading(false);
          setActiveJob(null);
          toast({
            title: "Falha na análise",
            description: job.error_message || "Erro desconhecido no processamento.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro durante o polling do job:", error);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [toast]);

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

      if (!user?.id || !workspace?.id) {
        toast({
          title: "Missing workspace context",
          description: "You must be logged in and attached to a workspace.",
          variant: "destructive",
        });
        return;
      }

      lastConversationsRef.current = conversations;
      setLoading(true);

      try {
        const inputHash = await hashDataset(conversationsToJsonl(conversations));
        const file = buildDatasetFile(conversations);

        const uploaded = await uploadDatasetToStorage({
          workspaceId: workspace.id,
          inputHash,
          file,
        });

        const job = await createAnalysisJob({
          workspaceId: workspace.id,
          createdBy: user.id,
          sourceFilename: file.name,
          inputHash,
          datasetPath: uploaded.path,
        });

        setActiveJob(job);
        pollJobStatus(job.id);

        toast({
          title: "Analysis job created",
          description: "Your dataset was queued successfully.",
        });
      } catch (error: unknown) {
        setLoading(false);
        toast({
          title: "Failed to queue analysis",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [pollJobStatus, toast, user?.id, workspace?.id]
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
            saveResult(mapped);
            setResult(mapped);
            setDataSource("fresh");
            markHasHistory();

            if (user?.id && workspace?.id) {
              const inputHash = await hashDataset(JSON.stringify(mapped));

              await saveAnalysisRun({
                workspaceId: workspace.id,
                createdBy: user.id,
                inputHash,
                result: toPersistableResult(mapped),
              });
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
    [finishLoading, markHasHistory, toast, user?.id, workspace?.id]
  );

  const clearAnalysis = useCallback(() => {
    setResult(null);
    setDataSource("fresh");
    setActiveJob(null);
  }, []);

  const loadStoredAnalysis = useCallback((analysis: AnalysisResult) => {
    saveResult(analysis);
    setResult(analysis);
    setDataSource("cached");
    markHasHistory();
  }, [markHasHistory]);

  const value = useMemo(
    () => ({
      result,
      hasHistory,
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
