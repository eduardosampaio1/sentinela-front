import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ExperienceResult, ExperienceState } from "../experience/types";

export function ExperienceResponse({ phase, result, error }: {
  phase: ExperienceState;
  result: ExperienceResult | null;
  error: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const processing = ["understanding", "deciding", "responding"].includes(phase);

  return (
    <div className="ws-response" aria-live="polite" aria-busy={processing}>
      <AnimatePresence mode="wait">
        {processing ? (
          <motion.div
            key={phase}
            className="ws-response__processing"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span>{phase === "understanding" ? "UNDERSTAND" : phase === "deciding" ? "DECIDE" : "CONTROL"}</span>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            className="ws-response__answer"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>{result.answer}</p>
            {result.illustrative && <small>Illustrative experience, not a measured customer result.</small>}
          </motion.div>
        ) : error ? (
          <p className="ws-response__error">{error}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
