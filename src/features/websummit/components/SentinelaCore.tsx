import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ExperienceState } from "../experience/types";

const layers = Array.from({ length: 9 }, (_, index) => index);

export const SentinelaCore = memo(function SentinelaCore({ state }: { state: ExperienceState }) {
  const reduceMotion = useReducedMotion();
  const active = !["idle", "aware", "complete", "error"].includes(state);

  return (
    <div className="ws-core-wrap" data-state={state} aria-hidden="true">
      <motion.div
        className="ws-core"
        animate={reduceMotion ? undefined : { rotate: active ? 1.2 : -0.8, scale: state === "deciding" ? 0.94 : 1 }}
        transition={{ type: "spring", stiffness: 50, damping: 18 }}
      >
        <div className="ws-core__aperture">
          {layers.map((layer) => (
            <span key={layer} className="ws-core__layer" style={{ "--ws-layer": layer } as React.CSSProperties} />
          ))}
        </div>
        <div className="ws-core__signal" />
      </motion.div>
      <p className="ws-core__state" aria-live="polite">{stateLabel(state)}</p>
    </div>
  );
});

function stateLabel(state: ExperienceState) {
  if (state === "idle" || state === "aware") return "Ready";
  if (state === "listening") return "Listening";
  if (state === "understanding") return "Understand";
  if (state === "deciding") return "Decide";
  if (state === "responding") return "Control";
  if (state === "error") return "Available in fallback mode";
  return "Complete";
}
