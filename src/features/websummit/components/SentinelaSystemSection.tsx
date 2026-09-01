import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const decisions = [
  ["OBSERVE", "Measure behavior, drift, consistency, handoffs and cost across real conversations."],
  ["CONTROL", "Choose route, context and policy before the model acts."],
  ["INVESTIGATE", "Connect signals, contradictions, evidence and business impact."],
  ["IMPROVE", "Show what to change, why it matters and where to act first."],
] as const;

export function SentinelaSystemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const wordX = useTransform(scrollYProgress, [0, 1], ["-7%", "4%"]);
  const wordY = useTransform(scrollYProgress, [0, 1], [64, -52]);
  const contentY = useTransform(scrollYProgress, [0, 1], [54, -34]);
  const sequenceY = useTransform(scrollYProgress, [0, 1], [-24, 34]);

  return (
    <section ref={sectionRef} className="ws-section ws-system" aria-labelledby="ws-system-title">
      <motion.div
        className="ws-system__word"
        aria-hidden="true"
        style={reduceMotion ? undefined : { x: wordX, y: wordY }}
      >SENTINELA</motion.div>
      <motion.div className="ws-system__content" style={reduceMotion ? undefined : { y: contentY }}>
        <h2 id="ws-system-title">See the operation. Control the next decision.</h2>
        <p>For teams already serving customers with AI, Sentinela connects what happened at scale with what should happen now.</p>
      </motion.div>
      <motion.div className="ws-system__sequence" style={reduceMotion ? undefined : { y: sequenceY }}>
        {decisions.map(([label, description], index) => (
          <motion.div
            key={label}
            className="ws-system__decision"
            initial={reduceMotion ? false : { opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ delay: index * 0.08, duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
          >
            <strong>{label}</strong>
            <span>{description}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
