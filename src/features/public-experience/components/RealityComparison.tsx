import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { trackPublicExperienceEvent } from "../analytics/events";
import { usePublicExperience } from "../usePublicExperience";

export function RealityComparison() {
  const { copy, variant } = usePublicExperience();
  const sectionRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState(50);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const titleX = useTransform(scrollYProgress, [0, 0.5, 1], [-38, 0, 26]);
  const stageY = useTransform(scrollYProgress, [0, 1], [64, -42]);

  return (
    <section ref={sectionRef} className="ws-section ws-comparison" aria-labelledby="ws-comparison-title">
      <motion.h2 id="ws-comparison-title" style={reduceMotion ? undefined : { x: titleX }}>
        {copy.comparison.title}
      </motion.h2>
      <motion.div
        className="ws-comparison__stage-shell"
        style={reduceMotion ? undefined : { y: stageY }}
      >
      <div className="ws-comparison__stage" style={{ "--ws-split": `${position}%` } as React.CSSProperties}>
        <div className="ws-comparison__side ws-comparison__without">
          <span>{copy.comparison.without}</span>
          <strong>{copy.comparison.withoutTitle}</strong>
          {copy.comparison.withoutItems.map((item) => <p key={item}>{item}</p>)}
        </div>
        <div className="ws-comparison__side ws-comparison__with">
          <span>{copy.comparison.with}</span>
          <strong>{copy.comparison.withTitle}</strong>
          {copy.comparison.withItems.map((item) => <p key={item}>{item}</p>)}
        </div>
        <label className="ws-sr-only" htmlFor="ws-reality-slider">{copy.comparison.slider}</label>
        <input
          id="ws-reality-slider"
          type="range"
          min="18"
          max="82"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerUp={() => trackPublicExperienceEvent(variant, "comparison_interact", { position })}
        />
      </div>
      </motion.div>
      <p className="ws-comparison__note">{copy.comparison.note}</p>
    </section>
  );
}
