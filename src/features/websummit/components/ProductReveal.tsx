import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { webSummitCopy } from "../content/copy";

export function ProductReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const statementY = useTransform(scrollYProgress, [0, 1], [72, -68]);
  const explanationY = useTransform(scrollYProgress, [0, 1], [28, -24]);
  return (
    <section ref={sectionRef} className="ws-section ws-reveal" aria-labelledby="ws-reveal-title">
      <motion.div
        className="ws-reveal__statement"
        style={reduceMotion ? undefined : { y: statementY }}
        initial={reduceMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 id="ws-reveal-title">{webSummitCopy.reveal.statement}</h2>
      </motion.div>
      <motion.p style={reduceMotion ? undefined : { y: explanationY }}>
        {webSummitCopy.reveal.explanation}
      </motion.p>
    </section>
  );
}
