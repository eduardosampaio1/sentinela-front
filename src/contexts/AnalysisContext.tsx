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
import { saveAnalysisRun } from "@/lib/analysisRuns";
import {
  createAnalysisJob,
  uploadDatasetToStorage,
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
  const [dataSource, setDataSource] = useState<"cached" | "fresh">("fresh");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeJob, setActiveJob] = useState<AnalysisJobRecord | null>(null);

  const lastConversationsRef = useRef<unknown[] | null>(null);

  const { toast } = useToast();
  const { user, workspace } = useAuth();

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
    }
  }, []);

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
        const inputHash = hashDataset(conversationsToJsonl(conversations));
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
          datasetPath: uploaded.fullPath,
        });

        setActiveJob(job);

        toast({
          title: "Analysis job created",
          description: "Your dataset was queued successfully. Processing will start soon.",
        });
      } catch (error: unknown) {
        toast({
          title: "Failed to queue analysis",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        finishLoading();
      }
    },
    [finishLoading, toast, user?.id, workspace?.id]
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

  // continua útil para importar resultado pronto sem depender do worker
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

            if (user?.id && workspace?.id) {
              const inputHash = hashDataset(JSON.stringify(mapped));

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
    [finishLoading, toast, user?.id, workspace?.id]
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
  }, []);

  const value = useMemo(
    () => ({
      result,
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