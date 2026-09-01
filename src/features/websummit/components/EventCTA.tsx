import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { webSummitCopy } from "../content/copy";
import { LeadCaptureDialog } from "./LeadCaptureDialog";
import { trackWebSummitEvent } from "../analytics/events";

export function EventCTA() {
  const [open, setOpen] = useState(false);
  return (
    <section className="ws-section ws-event-cta">
      <h2>{webSummitCopy.cta.title}</h2>
      <button
        className="ws-primary-action"
        type="button"
        onClick={() => {
          setOpen(true);
          trackWebSummitEvent("websummit_lead_open");
        }}
      >
        {webSummitCopy.cta.button}<ArrowUpRight aria-hidden="true" />
      </button>
      <LeadCaptureDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
