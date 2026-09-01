import { useEffect } from "react";
import { AmbientField } from "./components/AmbientField";
import { HeroExperience } from "./components/HeroExperience";
import { ProductReveal } from "./components/ProductReveal";
import { SentinelaSystemSection } from "./components/SentinelaSystemSection";
import { RealityComparison } from "./components/RealityComparison";
import { EventCTA } from "./components/EventCTA";
import { EventFooter } from "./components/EventFooter";
import { usePointerField } from "./hooks/usePointerField";
import { useWebSummitMetadata } from "./hooks/useWebSummitMetadata";
import { trackWebSummitEvent } from "./analytics/events";
import "./styles/tokens.css";
import "./styles/core.css";
import "./styles/layout.css";
import "./styles/responsive.css";

export function WebSummitPage() {
  const pageRef = usePointerField<HTMLDivElement>();
  useWebSummitMetadata();

  useEffect(() => trackWebSummitEvent("websummit_page_view"), []);

  return (
    <div className="ws-page" ref={pageRef}>
      <a className="ws-skip-link" href="#ws-main">Skip to experience</a>
      <AmbientField />
      <main id="ws-main">
        <HeroExperience />
        <ProductReveal />
        <SentinelaSystemSection />
        <RealityComparison />
        <EventCTA />
      </main>
      <EventFooter />
    </div>
  );
}
