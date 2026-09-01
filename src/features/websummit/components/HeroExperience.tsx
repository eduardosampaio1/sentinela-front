import { useState } from "react";
import { webSummitCopy } from "../content/copy";
import { useExperienceState } from "../hooks/useExperienceState";
import { PromptComposer } from "./PromptComposer";
import { LivingSentinelaField } from "./LivingSentinelaField";
import { ExperienceResponse } from "./ExperienceResponse";
import { DecisionTrace } from "./DecisionTrace";
import { TryToBreak } from "./TryToBreak";

export function HeroExperience() {
  const [prompt, setPrompt] = useState("");
  const [traceOpen, setTraceOpen] = useState(false);
  const experience = useExperienceState();
  const processing = ["understanding", "deciding", "responding"].includes(experience.phase);

  const submit = (value: string) => {
    setTraceOpen(false);
    experience.submit(value);
  };

  return (
    <section className="ws-hero" data-state={experience.phase} aria-labelledby="ws-hero-title">
      <div className="ws-hero__brand">
        <strong>{webSummitCopy.brand}</strong>
        <span>CONTROL HOW AI IS USED</span>
      </div>
      <div className="ws-hero__visual">
        <LivingSentinelaField state={experience.phase} />
        <span className="ws-hero__state" aria-live="polite">{stateLabel(experience.phase)}</span>
      </div>
      <div className="ws-hero__content">
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
        {experience.result && <DecisionTrace result={experience.result} open={traceOpen} onOpenChange={setTraceOpen} />}
        {!experience.result && !processing && (
          <TryToBreak onSelect={(value) => { setPrompt(value); submit(value); }} />
        )}
      </div>
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
