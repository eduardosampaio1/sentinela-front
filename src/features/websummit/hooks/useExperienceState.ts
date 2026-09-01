import { useCallback, useMemo, useReducer, useRef } from "react";
import { createExperienceProvider } from "../experience/provider";
import type { ExperienceResult, ExperienceState } from "../experience/types";

interface ExperienceViewState {
  phase: ExperienceState;
  result: ExperienceResult | null;
  error: string | null;
}

type Action =
  | { type: "PHASE"; phase: ExperienceState }
  | { type: "RESULT"; result: ExperienceResult }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

export const initialExperienceState: ExperienceViewState = {
  phase: "idle",
  result: null,
  error: null,
};

export function experienceReducer(state: ExperienceViewState, action: Action): ExperienceViewState {
  switch (action.type) {
    case "PHASE":
      return { ...state, phase: action.phase, error: null };
    case "RESULT":
      return { phase: "complete", result: action.result, error: null };
    case "ERROR":
      return { ...state, phase: "error", error: action.message };
    case "RESET":
      return initialExperienceState;
  }
}

export function useExperienceState() {
  const [state, dispatch] = useReducer(experienceReducer, initialExperienceState);
  const provider = useMemo(() => createExperienceProvider(), []);
  const activeRequest = useRef<AbortController | null>(null);

  const submit = useCallback(async (input: string) => {
    activeRequest.current?.abort();
    const request = new AbortController();
    activeRequest.current = request;
    dispatch({ type: "PHASE", phase: "understanding" });

    const decisionTimer = window.setTimeout(() => dispatch({ type: "PHASE", phase: "deciding" }), 420);
    const responseTimer = window.setTimeout(() => dispatch({ type: "PHASE", phase: "responding" }), 820);
    try {
      const result = await provider.submit(input, request.signal);
      dispatch({ type: "RESULT", result });
    } catch {
      if (!request.signal.aborted) {
        dispatch({ type: "ERROR", message: "Sentinela could not complete this pass. Try again." });
      }
    } finally {
      window.clearTimeout(decisionTimer);
      window.clearTimeout(responseTimer);
    }
  }, [provider]);

  const setAware = useCallback(() => {
    if (state.phase === "idle") dispatch({ type: "PHASE", phase: "aware" });
  }, [state.phase]);

  const setListening = useCallback(() => {
    if (["idle", "aware", "complete", "error"].includes(state.phase)) {
      dispatch({ type: "PHASE", phase: "listening" });
    }
  }, [state.phase]);

  return { ...state, submit, setAware, setListening, reset: () => dispatch({ type: "RESET" }) };
}
