import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { webSummitCopy } from "../content/copy";

const levers = [
  ["BYPASS", "Do not call a model when a safe, approved response is enough."],
  ["SHRINK", "Send only the context the request actually needs."],
  ["ROUTE", "Match complexity, risk and cost to the right model."],
] as const;

export function CostControlSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const valueX = useTransform(scrollYProgress, [0, 1], ["-5%", "4%"]);
  const detailY = useTransform(scrollYProgress, [0, 1], [60, -36]);

  return (
    <section ref={sectionRef} className="ws-section ws-economics" aria-labelledby="ws-economics-title">
      <div className="ws-economics__intro">
        <h2 id="ws-economics-title">{webSummitCopy.economics.title}</h2>
        <p>{webSummitCopy.economics.explanation}</p>
      </div>
      <motion.div className="ws-economics__value" style={reduceMotion ? undefined : { x: valueX }}>
        <span>UP TO</span>
        <strong>{webSummitCopy.economics.value}</strong>
        <p>{webSummitCopy.economics.qualifier}</p>
      </motion.div>
      <motion.div className="ws-economics__levers" style={reduceMotion ? undefined : { y: detailY }}>
        {levers.map(([label, description], index) => (
          <motion.div
            key={label}
            className="ws-economics__lever"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.65 }}
            transition={{ delay: index * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <strong>{label}</strong>
            <span>{description}</span>
          </motion.div>
        ))}
      </motion.div>
      <p className="ws-economics__disclosure">{webSummitCopy.economics.disclosure}</p>
    </section>
  );
}
