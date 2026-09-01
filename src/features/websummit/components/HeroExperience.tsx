import { useState } from "react";
import { webSummitCopy } from "../content/copy";
import { useExperienceState } from "../hooks/useExperienceState";
import { PromptComposer } from "./PromptComposer";
import { SentinelaCore } from "./SentinelaCore";
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
    <section className="ws-hero" aria-labelledby="ws-hero-title">
      <div className="ws-hero__brand">{webSummitCopy.brand}</div>
      <div className="ws-hero__core"><SentinelaCore state={experience.phase} /></div>
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
