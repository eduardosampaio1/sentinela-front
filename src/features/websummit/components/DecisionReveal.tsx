import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ExperienceResult, ExperienceState } from "../experience/types";
import { DecisionTrace } from "./DecisionTrace";
import { SentinelaDecisionField } from "./SentinelaDecisionField";

const stages = ["UNDERSTAND", "DECIDE", "CONTROL", "RESPOND"] as const;
const stageByState: Partial<Record<ExperienceState, number>> = {
  understanding: 0,
  deciding: 1,
  responding: 2,
  complete: 3,
};

export function DecisionReveal({ result }: { result: ExperienceResult }) {
  const reduceMotion = useReducedMotion();
  const [playbackState, setPlaybackState] = useState<ExperienceState>(reduceMotion ? "complete" : "understanding");
  const activeStage = stageByState[playbackState] ?? 0;

  useEffect(() => {
    if (reduceMotion) {
      setPlaybackState("complete");
      return;
    }

    setPlaybackState("understanding");
    const timers = [
      window.setTimeout(() => setPlaybackState("deciding"), 680),
      window.setTimeout(() => setPlaybackState("responding"), 1360),
      window.setTimeout(() => setPlaybackState("complete"), 2140),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduceMotion, result]);

  const status = useMemo(() => stateLabel(playbackState), [playbackState]);

  return (
    <motion.section
      className="ws-decision-reveal"
      aria-labelledby="ws-decision-reveal-title"
      initial={reduceMotion ? false : { opacity: 0, y: 42, scale: 0.975 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.985 }}
      transition={{ type: "spring", stiffness: 92, damping: 19, mass: 0.9 }}
    >
      <header className="ws-decision-reveal__header">
        <div>
          <p>BEFORE THE ANSWER</p>
          <h2 id="ws-decision-reveal-title">One request. Four checks. One controlled route.</h2>
        </div>
        <span className="ws-decision-reveal__status" aria-live="polite">{status}</span>
      </header>

      <div className="ws-decision-reveal__body">
        <div className="ws-decision-reveal__field" data-stage={activeStage}>
          <SentinelaDecisionField state={playbackState} decision={result.decision} />
          <div className="ws-decision-reveal__stages" aria-label={`Decision replay: ${stages[activeStage].toLowerCase()}`}>
            {stages.map((stage, index) => (
              <span key={stage} data-status={index < activeStage ? "complete" : index === activeStage ? "active" : "waiting"}>
                {stage}
              </span>
            ))}
          </div>
        </div>
        <DecisionTrace result={result} />
      </div>
    </motion.section>
  );
}

function stateLabel(state: ExperienceState) {
  if (state === "understanding") return "READING SIGNALS";
  if (state === "deciding") return "CHOOSING THE ROUTE";
  if (state === "responding") return "APPLYING CONTROL";
  return "DECISION COMPLETE";
}
