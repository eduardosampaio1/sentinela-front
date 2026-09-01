import { motion, useReducedMotion } from "motion/react";
import { webSummitCopy } from "../content/copy";

export function ArgosAionSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="ws-section ws-duality" aria-label="Sentinela systems">
      <motion.article
        className="ws-duality__system ws-duality__system--argos"
        initial={reduceMotion ? false : { opacity: 0, x: -28 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.5 }}
      >
        <h2>ARGOS</h2>
        <p>{webSummitCopy.systems.argos}</p>
      </motion.article>
      <div className="ws-duality__link" aria-hidden="true"><span /></div>
      <motion.article
        className="ws-duality__system ws-duality__system--aion"
        initial={reduceMotion ? false : { opacity: 0, x: 28 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.5 }}
      >
        <h2>AION</h2>
        <p>{webSummitCopy.systems.aion}</p>
      </motion.article>
    </section>
  );
}
