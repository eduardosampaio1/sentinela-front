import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { usePublicExperience } from "../usePublicExperience";
import { LeadCaptureDialog } from "./LeadCaptureDialog";
import { trackPublicExperienceEvent } from "../analytics/events";

export function ExperienceCTA() {
  const [open, setOpen] = useState(false);
  const { variant, copy } = usePublicExperience();

  return (
    <section className="ws-section ws-event-cta" aria-labelledby="ws-final-cta-title">
      <h2 id="ws-final-cta-title">{copy.cta.ctaTitle}</h2>
      {copy.cta.ctaHref ? (
        <a className="ws-primary-action" href={copy.cta.ctaHref}>
          {copy.cta.ctaLabel}<ArrowUpRight aria-hidden="true" />
        </a>
      ) : (
        <button
          className="ws-primary-action"
          type="button"
          onClick={() => {
            setOpen(true);
            trackPublicExperienceEvent(variant, "lead_open");
          }}
        >
          {copy.cta.ctaLabel}<ArrowUpRight aria-hidden="true" />
        </button>
      )}
      {variant === "websummit" && <LeadCaptureDialog open={open} onOpenChange={setOpen} />}
    </section>
  );
}
