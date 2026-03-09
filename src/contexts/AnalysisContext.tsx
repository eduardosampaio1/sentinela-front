import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { useToast } from "@/hooks/use-toast";

const ANALYSIS_STAGES = [
  "Uploading dataset",
  "Parsing conversations",
  "Calculating consistency score",
  "Measuring response stability",
  "Comparing intents",
  "Estimating token waste",
  "Generating recommendations",
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
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(() => loadResult());
  const [dataSource, setDataSource] = useState<"cached" | "fresh">(() => (isSessionCached() ? "cached" : "fresh"));
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastConversationsRef = useRef<unknown[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) return undefined;
    setLoadingStep(0);
    setLoadingProgress(10);
    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current < ANALYSIS_STAGES.length - 1 ? current + 1 : current));
      setLoadingProgress((current) => Math.min(92, current + 12));
    }, 850);
    return () => window.clearInterval(interval);
  }, [loading]);

  const finishLoading = useCallback(() => {
    setLoadingProgress(100);
    window.setTimeout(() => {
      setLoading(false);
      setLoadingStep(0);
      setLoadingProgress(0);
    }, 350);
  }, []);

  const runAnalysis = useCallback(async (conversations: unknown[]) => {
    if (conversations.length < 2) {
      toast({ title: "Minimum 2 conversations required", variant: "destructive" });
      return;
    }

    lastConversationsRef.current = conversations;
    const inputHash = hashDataset(conversations.map((item) => JSON.stringify(item)).join("\n"));
    setLoading(true);

    try {
      const data = await analyzeConversations(conversations);
      saveResult(data, inputHash);
      setResult(data);
      setDataSource("fresh");
      toast({ title: "Analysis complete" });
    } catch (error: unknown) {
      toast({ title: "Analysis failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      finishLoading();
    }
  }, [finishLoading, toast]);

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

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const conversations = parseConversationsInput(text);
        void runAnalysis(conversations);
      } catch (error: unknown) {
        toast({ title: "Invalid JSON file", description: getErrorMessage(error), variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }, [runAnalysis, toast]);

  const handlePasteAnalysis = useCallback((text: string) => {
    try {
      const conversations = parseConversationsInput(text);
      void runAnalysis(conversations);
    } catch (error: unknown) {
      toast({ title: "Invalid dataset JSON", description: getErrorMessage(error), variant: "destructive" });
    }
  }, [runAnalysis, toast]);

  const importAnalysisResult = useCallback((text: string) => {
    try {
      setLoading(true);
      const mapped = parseAnalysisImport(text);
      window.setTimeout(() => {
        saveResult(mapped);
        setResult(mapped);
        setDataSource("fresh");
        toast({ title: "Analysis result imported" });
        finishLoading();
      }, 1100);
    } catch (error: unknown) {
      setLoading(false);
      toast({ title: "Invalid analysis result", description: getErrorMessage(error), variant: "destructive" });
    }
  }, [finishLoading, toast]);

  const value = useMemo(() => ({
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
  }), [dataSource, handleFileUpload, handlePasteAnalysis, handleRerun, importAnalysisResult, loading, loadingProgress, loadingStep, result, runAnalysis]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error("useAnalysis must be used within AnalysisProvider");
  return context;
}
