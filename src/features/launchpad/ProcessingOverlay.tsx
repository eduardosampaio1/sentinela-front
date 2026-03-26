import { LoadingOverlay } from "@/shared/states/LoadingState";

const ANALYSIS_STAGES = [
  "Uploading dataset",
  "Creating analysis job",
  "Queueing request",
  "Waiting for worker",
];

interface ProcessingOverlayProps {
  visible: boolean;
  stage?: number;
  progress?: number;
  message?: string;
}

export function ProcessingOverlay({
  visible,
  stage = 0,
  progress,
  message,
}: ProcessingOverlayProps) {
  if (!visible) return null;

  return (
    <LoadingOverlay
      message={message ?? ANALYSIS_STAGES[stage] ?? "Analyzing dataset"}
      steps={ANALYSIS_STAGES}
      currentStep={stage}
      progress={progress}
    />
  );
}
