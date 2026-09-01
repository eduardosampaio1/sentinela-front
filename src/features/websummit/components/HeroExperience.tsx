import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { webSummitCopy } from "../content/copy";
import { useExperienceState } from "../hooks/useExperienceState";
import { PromptComposer } from "./PromptComposer";
import { SentinelaDecisionField } from "./SentinelaDecisionField";
import { ExperienceResponse } from "./ExperienceResponse";
import { DecisionTrace } from "./DecisionTrace";
import { TryToBreak } from "./TryToBreak";

export function HeroExperience() {
  const heroRef = useRef<HTMLElement>(null);
  const [prompt, setPrompt] = useState("");
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const brandY = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -62]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const experience = useExperienceState();
  const processing = ["understanding", "deciding", "responding"].includes(experience.phase);

  const submit = (value: string) => {
    experience.submit(value);
  };

  return (
    <section ref={heroRef} className="ws-hero" data-state={experience.phase} aria-labelledby="ws-hero-title">
      <motion.div className="ws-hero__brand" style={reduceMotion ? undefined : { y: brandY }}>
        <strong>{webSummitCopy.brand}</strong>
        <span>THE STEERING SYSTEM FOR AI CUSTOMER SERVICE</span>
      </motion.div>
      <motion.div
        className="ws-hero__visual"
        style={reduceMotion ? undefined : { y: visualY, scale: visualScale }}
      >
        <div className="ws-hero__visual-depth">
          <SentinelaDecisionField state={experience.phase} />
          <span className="ws-hero__state" aria-live="polite">{stateLabel(experience.phase)}</span>
        </div>
      </motion.div>
      <motion.div className="ws-hero__content" style={reduceMotion ? undefined : { y: contentY }}>
        <div className="ws-hero__content-depth">
          <h1 id="ws-hero-title">{webSummitCopy.headline}</h1>
          <p className="ws-hero__invitation">{webSummitCopy.invitation}</p>
          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSubmit={submit}
            onFocus={experience.setListening}
            disabled={processing}
          />
          <ExperienceResponse phase={experience.phase} result={experience.result} error={experience.error} />
          {experience.result && <DecisionTrace result={experience.result} />}
          {!experience.result && !processing && (
            <TryToBreak onSelect={(value) => { setPrompt(value); submit(value); }} />
          )}
        </div>
      </motion.div>
    </section>
  );
}

function stateLabel(state: ReturnType<typeof useExperienceState>["phase"]) {
  if (state === "idle" || state === "aware") return "SENTINELA IS READY";
  if (state === "listening") return "SENTINELA IS LISTENING";
  if (state === "understanding") return "READING INTENT";
  if (state === "deciding") return "FORMING A DECISION";
  if (state === "responding") return "APPLYING CONTROL";
  if (state === "error") return "SAFE FALLBACK ACTIVE";
  return "DECISION COMPLETE";
}
