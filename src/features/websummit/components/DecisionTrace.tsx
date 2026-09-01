import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, X } from "lucide-react";
import type { ExperienceResult } from "../experience/types";
import { trackWebSummitEvent } from "../analytics/events";

export function DecisionTrace({ result, open, onOpenChange }: {
  result: ExperienceResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="ws-trace-shell">
      <button
        className="ws-text-action"
        type="button"
        onClick={() => {
          onOpenChange(!open);
          if (!open) trackWebSummitEvent("websummit_trace_open");
        }}
        aria-expanded={open}
        aria-controls="ws-decision-trace"
      >
        {open ? "Close the trace" : "See what happened"}
        {open ? <X aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="ws-decision-trace"
            className="ws-trace"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="ws-trace__origin">YOU</div>
            {result.trace.map((step, index) => (
              <motion.div
                className="ws-trace__step"
                key={step.stage}
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.09 }}
              >
                <span className="ws-trace__rail" aria-hidden="true" />
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </motion.div>
            ))}
            <div className="ws-trace__destination">ANSWER</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
