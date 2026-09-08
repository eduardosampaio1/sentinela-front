import { useEffect } from "react";
import { AmbientField } from "./components/AmbientField";
import { HeroExperience } from "./components/HeroExperience";
import { ProductReveal } from "./components/ProductReveal";
import { SentinelaSystemSection } from "./components/SentinelaSystemSection";
import { CostControlSection } from "./components/CostControlSection";
import { RealityComparison } from "./components/RealityComparison";
import { ExperienceCTA } from "./components/ExperienceCTA";
import { ExperienceFooter } from "./components/ExperienceFooter";
import { PublicExperienceHeader } from "./components/PublicExperienceHeader";
import { usePointerField } from "./hooks/usePointerField";
import { usePublicExperienceMetadata } from "./hooks/usePublicExperienceMetadata";
import { trackPublicExperienceEvent } from "./analytics/events";
import { PublicExperienceConfigProvider } from "./PublicExperienceContext";
import { usePublicExperience } from "./usePublicExperience";
import type { PublicExperienceVariant } from "./content/copy";
import "./styles/tokens.css";
import "./styles/core.css";
import "./styles/layout.css";
import "./styles/responsive.css";

export function PublicExperiencePage({ variant = "official" }: { variant?: PublicExperienceVariant }) {
  return (
    <PublicExperienceConfigProvider variant={variant}>
      <PublicExperienceSurface />
    </PublicExperienceConfigProvider>
  );
}

function PublicExperienceSurface() {
  const pageRef = usePointerField<HTMLDivElement>();
  const { variant, copy } = usePublicExperience();
  usePublicExperienceMetadata();

  useEffect(() => trackPublicExperienceEvent(variant, "page_view"), [variant]);

  return (
    <div className="ws-page" ref={pageRef} data-variant={variant}>
      <a className="ws-skip-link" href="#ws-main">{copy.skip}</a>
      <AmbientField />
      <PublicExperienceHeader />
      <main id="ws-main">
        <HeroExperience />
        <ProductReveal />
        <SentinelaSystemSection />
        <CostControlSection />
        <RealityComparison />
        <ExperienceCTA />
      </main>
      <ExperienceFooter />
    </div>
  );
}
