import { motion, useReducedMotion } from "motion/react";
import { trackLisboaEvent } from "../analytics/events";

function Reveal({
  children,
  className = "",
  chapter,
}: {
  children: React.ReactNode;
  className?: string;
  chapter: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onViewportEnter={() => trackLisboaEvent("scroll_chapter", { chapter })}
    >
      {children}
    </motion.div>
  );
}

export function NarrativeFlow() {
  return (
    <>
      <section className="lx-tension">
        <Reveal chapter="tension">
          <p>Every AI request is already a business decision.</p>
          <h2>Most systems skip the decision.</h2>
        </Reveal>
      </section>

      <section className="lx-control-layer">
        <Reveal className="lx-control-intro" chapter="control_layer">
          <h2>
            One control layer.
            <br />
            Two moments.
          </h2>
          <p>
            Sentinela measures what happened, then controls what happens next.
            Evidence remains separate from action.
          </p>
        </Reveal>
        <div
          className="lx-time-axis"
          aria-label="Sentinela across past and present"
        >
          <Reveal className="lx-time-past" chapter="past">
            <span>Past</span>
            <h3>Understand the operation.</h3>
            <p>
              Quality, drift, behavior, cost, intent and evidence across real
              conversations.
            </p>
          </Reveal>
          <div className="lx-time-membrane" aria-hidden="true">
            <b />
            <b />
            <b />
            <b />
            <b />
          </div>
          <Reveal className="lx-time-present" chapter="present">
            <span>Now</span>
            <h3>Control each request.</h3>
            <p>
              Decide whether AI is needed, choose the route, reduce context and
              enforce policy.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="lx-impact">
        <Reveal className="lx-impact-lead" chapter="impact">
          <h2>Better AI is not only a better model.</h2>
        </Reveal>
        <div
          className="lx-impact-orbit"
          aria-label="Outcomes controlled by Sentinela"
        >
          <span>Quality</span>
          <span>Cost</span>
          <span>Risk</span>
          <span>Control</span>
          <p>
            One operating decision
            <br />
            connects all four.
          </p>
        </div>
      </section>
    </>
  );
}
