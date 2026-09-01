import { motion, useReducedMotion } from "motion/react";
import type { ExperienceResult } from "../experience/types";

export function DecisionTrace({ result }: { result: ExperienceResult }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="ws-trace-shell">
      <motion.p
        className="ws-trace__heading"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >What Sentinela did</motion.p>
      <motion.div
        id="ws-decision-trace"
        className="ws-trace"
        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
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
    </div>
  );
}
