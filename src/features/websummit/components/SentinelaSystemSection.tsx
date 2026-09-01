import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const decisions = [
  ["OBSERVE", "Measure quality, drift, consistency, handoffs and cost across real customer conversations."],
  ["DECIDE", "Determine whether AI is needed, which model should act and what context it needs."],
  ["CONTROL", "Apply routing, compression, policy and response checks before and after the model acts."],
  ["IMPROVE", "Turn evidence into prioritized changes across quality, cost and operations."],
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
        <h2 id="ws-system-title">See what happened. Steer what happens next.</h2>
        <p>Sentinela is the observability and control layer between your customer-service stack and the models it uses, designed to keep customer data inside your infrastructure boundary.</p>
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
