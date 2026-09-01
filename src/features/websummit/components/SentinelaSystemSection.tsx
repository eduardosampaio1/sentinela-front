import { motion, useReducedMotion } from "motion/react";

const decisions = [
  ["UNDERSTAND", "Read the request and its context."],
  ["DECIDE", "Choose what should happen next."],
  ["CONTROL", "Apply limits before AI acts."],
  ["EXPLAIN", "Keep the decision visible."],
] as const;

export function SentinelaSystemSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="ws-section ws-system" aria-labelledby="ws-system-title">
      <div className="ws-system__word" aria-hidden="true">SENTINELA</div>
      <div className="ws-system__content">
        <h2 id="ws-system-title">One system. Every decision visible.</h2>
        <p>Sentinela sits between intent and execution, deciding how AI should be used before the request moves forward.</p>
      </div>
      <div className="ws-system__sequence">
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
      </div>
    </section>
  );
}
