import { useEffect } from "react";
import { LisboaHeader } from "./components/LisboaHeader";
import { LisboaHero } from "./components/LisboaHero";
import { NarrativeFlow } from "./components/NarrativeFlow";
import { RealityComparison } from "./components/RealityComparison";
import { LisbonCTA } from "./components/LisbonCTA";
import { useExperienceMachine } from "./hooks/useExperienceMachine";
import { useLisboaMetadata } from "./hooks/useLisboaMetadata";
import { usePointerField } from "./hooks/usePointerField";
import { trackLisboaEvent } from "./analytics/events";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/motion.css";
import "./styles/responsive.css";

export function WebSummitLisboaPage() {
  const pageRef = usePointerField<HTMLDivElement>();
  const { state, result, submit } = useExperienceMachine();
  useLisboaMetadata();
  useEffect(() => trackLisboaEvent("page_view"), []);
  useEffect(() => {
    if (result)
      trackLisboaEvent("analysis_complete", { route: result.decision.route });
  }, [result]);

  return (
    <div className="lx-page" ref={pageRef} data-state={state}>
      <a className="lx-skip-link" href="#lx-main">
        Skip to the experience
      </a>
      <div className="lx-grain" aria-hidden="true" />
      <LisboaHeader />
      <main id="lx-main">
        <LisboaHero state={state} result={result} onSubmit={submit} />
        <NarrativeFlow />
        <RealityComparison />
        <LisbonCTA />
      </main>
    </div>
  );
}
