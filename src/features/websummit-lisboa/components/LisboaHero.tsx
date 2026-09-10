import type {
  LisboaExperienceResult,
  LisboaExperienceState,
} from "../experience/types";
import { PromptComposer } from "./PromptComposer";
import { LivingSystem } from "./LivingSystem";
import { DecisionEvidence } from "./DecisionEvidence";
import { DecisionTrace } from "./DecisionTrace";

interface Props {
  state: LisboaExperienceState;
  result: LisboaExperienceResult | null;
  onSubmit: (prompt: string) => void;
}

export function LisboaHero({ state, result, onSubmit }: Props) {
  const active = state !== "idle";
  const busy = !["idle", "complete", "resting", "error"].includes(state);
  return (
    <section className="lx-hero" id="experience" data-awake={active}>
      <div className="lx-idle-signal" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="lx-hero-message">
        <p className="lx-kicker">Before the answer</p>
        <h1>AI shouldn't answer everything.</h1>
        <p>Let Sentinela decide what should happen first.</p>
        <PromptComposer busy={busy} onSubmit={onSubmit} />
      </div>
      {active && (
        <div className="lx-system" data-state={state}>
          <LivingSystem state={state} active={active} />
          <DecisionEvidence state={state} result={result} />
          {result && <DecisionTrace result={result} />}
        </div>
      )}
    </section>
  );
}
