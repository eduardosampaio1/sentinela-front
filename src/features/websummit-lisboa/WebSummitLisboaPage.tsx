import { useEffect } from "react";
import { ConvergenceHeader } from "./convergence/ConvergenceHeader";
import { ConvergenceHero } from "./convergence/ConvergenceHero";
import { ConvergenceStory } from "./convergence/ConvergenceStory";
import { useExperienceMachine } from "./hooks/useExperienceMachine";
import { useLisboaMetadata } from "./hooks/useLisboaMetadata";
import { usePointerField } from "./hooks/usePointerField";
import { trackLisboaEvent } from "./analytics/events";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/motion.css";
import "./styles/responsive.css";
import "./convergence/convergence.css";

export function WebSummitLisboaPage() {
  const pageRef = usePointerField<HTMLDivElement>();
  const { state, result, submit, reset } = useExperienceMachine();
  useLisboaMetadata();
  useEffect(() => trackLisboaEvent("page_view"), []);
  useEffect(() => {
    if (result)
      trackLisboaEvent("analysis_complete", { route: result.decision.route });
  }, [result]);

  return (
    <div
      className="lx-page wsl-page"
      ref={pageRef}
      data-state={state}
      data-route={result?.decision.route ?? "none"}
    >
      <a className="lx-skip-link" href="#lx-main">
        Skip to the experience
      </a>
      <ConvergenceHeader />
      <main id="lx-main">
        <ConvergenceHero
          state={state}
          result={result}
          onSubmit={submit}
          onReset={reset}
        />
        <ConvergenceStory />
      </main>
      <footer className="wsl-footer">
        <span>SENTINELA © 2026</span>
        <span>CONTROL BEFORE CONSEQUENCE.</span>
      </footer>
    </div>
  );
}
