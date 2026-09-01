import { motion, useReducedMotion } from "motion/react";
import { webSummitCopy } from "../content/copy";

export function ProductReveal() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="ws-section ws-reveal" aria-labelledby="ws-reveal-title">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 id="ws-reveal-title">{webSummitCopy.reveal.statement}</h2>
        <p>{webSummitCopy.reveal.explanation}</p>
      </motion.div>
    </section>
  );
}
