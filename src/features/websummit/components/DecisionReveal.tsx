import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ExperienceResult, ExperienceState } from "../experience/types";
import { DecisionTrace } from "./DecisionTrace";
import { SentinelaDecisionField } from "./SentinelaDecisionField";

const stages = ["UNDERSTAND", "DECIDE", "CONTROL", "RESPOND"] as const;
const playbackStates: ExperienceState[] = ["understanding", "deciding", "responding", "complete"];

export function DecisionReveal({ result }: { result: ExperienceResult }) {
  const reduceMotion = useReducedMotion();
  const revealRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(reduceMotion ? 3 : 0);
  const [cycle, setCycle] = useState(0);
  const playbackState = playbackStates[activeStage];

  useEffect(() => {
    if (reduceMotion) {
      setActiveStage(3);
      return;
    }

    setActiveStage(0);
    const timers = [
      window.setTimeout(() => setActiveStage(1), 1000),
      window.setTimeout(() => setActiveStage(2), 2000),
      window.setTimeout(() => setActiveStage(3), 3000),
      window.setTimeout(() => setCycle((current) => current + 1), 4600),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [cycle, reduceMotion, result]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (revealRef.current && typeof revealRef.current.scrollIntoView === "function") {
        revealRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, result]);

  const status = useMemo(() => stateLabel(playbackState), [playbackState]);

  return (
    <motion.section
      ref={revealRef}
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
            <div className="ws-decision-reveal__stage-track" aria-hidden="true">
              <motion.span
                key={`progress-${cycle}`}
                className="ws-decision-reveal__stage-progress"
                initial={{ width: "0%" }}
                animate={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.span
                key={`packet-${cycle}`}
                className="ws-decision-reveal__stage-packet"
                initial={{ left: "0%", opacity: 0 }}
                animate={{ left: `${(activeStage / (stages.length - 1)) * 100}%`, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {stages.map((stage, index) => (
              <span className="ws-decision-reveal__stage" key={stage} data-status={index < activeStage ? "complete" : index === activeStage ? "active" : "waiting"}>
                <span className="ws-decision-reveal__stage-node" aria-hidden="true">
                  {index < activeStage || (reduceMotion && index === activeStage) ? "✓" : index + 1}
                </span>
                <span className="ws-decision-reveal__stage-label">{stage}</span>
              </span>
            ))}
          </div>
        </div>
        <DecisionTrace result={result} activeStage={activeStage} />
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
