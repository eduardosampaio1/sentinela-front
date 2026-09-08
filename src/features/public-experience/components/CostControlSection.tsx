import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { usePublicExperience } from "../usePublicExperience";

export function CostControlSection() {
  const { copy } = usePublicExperience();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const valueX = useTransform(scrollYProgress, [0, 1], ["-5%", "4%"]);
  const detailY = useTransform(scrollYProgress, [0, 1], [60, -36]);

  return (
    <section ref={sectionRef} className="ws-section ws-economics" aria-labelledby="ws-economics-title">
      <div className="ws-economics__intro">
        <h2 id="ws-economics-title">{copy.economics.title}</h2>
        <p>{copy.economics.explanation}</p>
      </div>
      <motion.div className="ws-economics__value" style={reduceMotion ? undefined : { x: valueX }}>
        <span>{copy.economics.upTo}</span>
        <strong>{copy.economics.value}</strong>
        <p>{copy.economics.qualifier}</p>
      </motion.div>
      <motion.div className="ws-economics__levers" style={reduceMotion ? undefined : { y: detailY }}>
        {copy.economics.levers.map(([label, description], index) => (
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
      <p className="ws-economics__disclosure">{copy.economics.disclosure}</p>
    </section>
  );
}
