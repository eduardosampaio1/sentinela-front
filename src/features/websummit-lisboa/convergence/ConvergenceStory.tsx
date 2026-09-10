import { type CSSProperties, type ReactNode, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LeadCaptureDialog } from "../components/LeadCaptureDialog";
import { trackLisboaEvent } from "../analytics/events";

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 46 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.32, once: true }}
      transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ConvergenceStory() {
  const [split, setSplit] = useState(52);
  const [leadOpen, setLeadOpen] = useState(false);

  const openLead = () => {
    setLeadOpen(true);
    trackLisboaEvent("lead_open");
  };

  return (
    <>
      <section className="wsl-tension">
        <span>THE DECISION MOST SYSTEMS SKIP</span>
        <Reveal>
          <h2>Every AI request is already a business decision.</h2>
          <p>Model, context, cost, risk and policy are chosen whether your operation governs them or not.</p>
        </Reveal>
      </section>

      <section className="wsl-moments">
        <header><span>ONE CONTROL LAYER</span><h2>TWO MOMENTS.<br />ONE TRUTH.</h2></header>
        <div className="wsl-moment-grid">
          <Reveal className="wsl-moment">
            <span>PAST / MEASURE</span>
            <h3>Understand what happened.</h3>
            <p>Quality, drift, behavior, cost, intent and evidence across real conversations.</p>
            <b>01</b>
          </Reveal>
          <div className="wsl-spine" aria-hidden="true"><i /><i /><i /><i /></div>
          <Reveal className="wsl-moment wsl-moment-now">
            <span>NOW / CONTROL</span>
            <h3>Control what happens next.</h3>
            <p>Decide whether AI is needed, choose the route, reduce context and enforce policy.</p>
            <b>02</b>
          </Reveal>
        </div>
      </section>

      <section className="wsl-outcomes">
        <span>ONE OPERATING DECISION</span>
        <h2>BETTER AI IS<br />NOT ONLY A<br /><em>BETTER MODEL.</em></h2>
        <div><b>QUALITY</b><b>COST</b><b>RISK</b><b>CONTROL</b></div>
        <p>Sentinela connects all four without pretending that the cheapest answer is the best one.</p>
      </section>

      <section className="wsl-reality">
        <header><span>ILLUSTRATIVE SIMULATION</span><h2>ONE REQUEST.<br />TWO REALITIES.</h2></header>
        <div className="wsl-reality-stage" style={{ "--split": `${split}%` } as CSSProperties}>
          <div className="wsl-without">
            <span>WITHOUT SENTINELA</span>
            <strong>AI is the default.</strong>
            <p>Full context sent<br />No route decision<br />No policy evidence</p>
          </div>
          <div className="wsl-with">
            <span>WITH SENTINELA</span>
            <strong>Decision comes first.</strong>
            <p>Need evaluated<br />Route selected<br />Context controlled</p>
          </div>
          <span className="wsl-reality-handle" aria-hidden="true">↔</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={split}
            onPointerDown={() => trackLisboaEvent("comparison_interaction")}
            onChange={(event) => setSplit(Number(event.target.value))}
            aria-label="Compare AI execution with and without Sentinela"
            aria-valuetext={`${split}% with Sentinela`}
          />
        </div>
        <small>Drag all the way across to see each reality in full. Example states are illustrative, not measured savings.</small>
      </section>

      <section className="wsl-close" id="meet">
        <span>WEB SUMMIT · LISBON · 2026</span>
        <h2>SEE THE<br />DECISION.<br /><em>CONTROL THE<br />CONSEQUENCE.</em></h2>
        <button type="button" onClick={openLead}>Meet Sentinela in Lisbon <i>↗</i></button>
        <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
      </section>
      <LeadCaptureDialog open={leadOpen} onOpenChange={setLeadOpen} />
    </>
  );
}
