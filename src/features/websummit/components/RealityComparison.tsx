import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { trackWebSummitEvent } from "../analytics/events";
import { webSummitCopy } from "../content/copy";

export function RealityComparison() {
  const sectionRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState(50);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const titleX = useTransform(scrollYProgress, [0, 0.5, 1], [-38, 0, 26]);
  const stageY = useTransform(scrollYProgress, [0, 1], [64, -42]);

  return (
    <section ref={sectionRef} className="ws-section ws-comparison" aria-labelledby="ws-comparison-title">
      <motion.h2 id="ws-comparison-title" style={reduceMotion ? undefined : { x: titleX }}>
        {webSummitCopy.comparison.title}
      </motion.h2>
      <motion.div
        className="ws-comparison__stage-shell"
        style={reduceMotion ? undefined : { y: stageY }}
      >
      <div className="ws-comparison__stage" style={{ "--ws-split": `${position}%` } as React.CSSProperties}>
        <div className="ws-comparison__side ws-comparison__without">
          <span>WITHOUT SENTINELA</span>
          <strong>Default route</strong>
          <p>Full context sent</p>
          <p>No policy decision</p>
          <p>No trace</p>
        </div>
        <div className="ws-comparison__side ws-comparison__with">
          <span>WITH SENTINELA</span>
          <strong>Intentional route</strong>
          <p>Context minimized</p>
          <p>Policy applied</p>
          <p>Decision trace retained</p>
        </div>
        <label className="ws-sr-only" htmlFor="ws-reality-slider">Compare without and with Sentinela</label>
        <input
          id="ws-reality-slider"
          type="range"
          min="18"
          max="82"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerUp={() => trackWebSummitEvent("websummit_comparison_interact", { position })}
        />
      </div>
      </motion.div>
      <p className="ws-comparison__note">{webSummitCopy.comparison.note}</p>
    </section>
  );
}
