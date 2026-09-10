import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLisboaProvider } from "../experience/provider";
import type {
  LisboaExperienceResult,
  LisboaExperienceState,
} from "../experience/types";

export const PROCESSING_SEQUENCE: LisboaExperienceState[] = [
  "aware",
  "receiving",
  "understanding",
  "evaluating",
  "deciding",
  "controlling",
  "responding",
];

export function stateLabel(state: LisboaExperienceState): string {
  const labels: Record<LisboaExperienceState, string> = {
    idle: "Ready",
    aware: "Presence detected",
    receiving: "Receiving request",
    understanding: "Understanding intent",
    evaluating: "Evaluating routes",
    deciding: "Selecting action",
    controlling: "Applying controls",
    responding: "Releasing response",
    complete: "Decision complete",
    resting: "System at rest",
    error: "Request interrupted",
  };
  return labels[state];
}

export function useExperienceMachine() {
  const provider = useMemo(() => createLisboaProvider(), []);
  const controller = useRef<AbortController | null>(null);
  const runId = useRef(0);
  const restingTimer = useRef<number | null>(null);
  const [state, setState] = useState<LisboaExperienceState>("idle");
  const [result, setResult] = useState<LisboaExperienceResult | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");

  useEffect(
    () => () => {
      controller.current?.abort();
      if (restingTimer.current !== null)
        window.clearTimeout(restingTimer.current);
    },
    [],
  );

  const submit = useCallback(
    async (prompt: string) => {
      const currentRun = ++runId.current;
      controller.current?.abort();
      if (restingTimer.current !== null)
        window.clearTimeout(restingTimer.current);
      controller.current = new AbortController();
      setResult(null);
      setLastPrompt(prompt);

      let resolved: LisboaExperienceResult | null = null;
      let failed = false;
      const request = provider
        .submit(prompt, controller.current.signal)
        .then((value) => {
          resolved = value;
        })
        .catch(() => {
          failed = true;
        });

      for (const next of PROCESSING_SEQUENCE) {
        if (currentRun !== runId.current) return;
        setState(next);
        await new Promise((resolve) =>
          window.setTimeout(resolve, next === "aware" ? 180 : 330),
        );
        if (failed) break;
      }
      await request;
      if (currentRun !== runId.current) return;
      if (failed || !resolved) {
        setState("error");
        return;
      }
      setResult(resolved);
      setState("complete");
      restingTimer.current = window.setTimeout(() => {
        if (currentRun === runId.current) setState("resting");
      }, 2800);
    },
    [provider],
  );

  const reset = useCallback(() => {
    runId.current += 1;
    controller.current?.abort();
    if (restingTimer.current !== null)
      window.clearTimeout(restingTimer.current);
    setResult(null);
    setState("idle");
  }, []);

  return { state, result, lastPrompt, submit, reset };
}
