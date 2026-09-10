import { motion, useReducedMotion } from "motion/react";
import type {
  LisboaExperienceResult,
  LisboaExperienceState,
} from "../experience/types";
import { stateLabel } from "../hooks/useExperienceMachine";

interface Props {
  state: LisboaExperienceState;
  result: LisboaExperienceResult | null;
}

export function DecisionEvidence({ state, result }: Props) {
  const reduce = useReducedMotion();
  const activeIndex =
    state === "understanding"
      ? 0
      : state === "evaluating" || state === "deciding"
        ? 1
        : state === "controlling"
          ? 2
          : state === "responding" ||
              state === "complete" ||
              state === "resting"
            ? 3
            : -1;
  return (
    <div className="lx-system-copy" aria-live="polite">
      <p className="lx-system-status">{stateLabel(state)}</p>
      <div className="lx-stage-line" aria-label="Decision progress">
        {["Understand", "Decide", "Control", "Respond"].map((label, index) => (
          <span key={label} data-active={index <= activeIndex}>
            {label}
          </span>
        ))}
      </div>
      {result && (
        <motion.div
          className="lx-result"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="lx-result-answer">{result.answer}</p>
          <dl className="lx-result-facts">
            <div>
              <dt>AI</dt>
              <dd>{result.decision.llmRequired ? "Required" : "Bypassed"}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{result.decision.route.replace(/-/g, " ")}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{result.decision.risk}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                {result.illustrative ? "Demo simulation" : "Live decision"}
              </dd>
            </div>
          </dl>
          {result.illustrative && (
            <small>
              Illustrative experience, not a measured customer result.
            </small>
          )}
        </motion.div>
      )}
    </div>
  );
}
