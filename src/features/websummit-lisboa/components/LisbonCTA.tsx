import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LeadCaptureDialog } from "./LeadCaptureDialog";
import { trackLisboaEvent } from "../analytics/events";

export function LisbonCTA() {
  const [open, setOpen] = useState(false);
  const show = () => {
    setOpen(true);
    trackLisboaEvent("lead_open");
  };
  return (
    <section className="lx-final" id="meet">
      <div className="lx-final-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p>Web Summit Lisbon 2026</p>
      <h2>Meet the system that decides before AI does.</h2>
      <button
        className="lx-primary lx-final-action"
        type="button"
        onClick={show}
      >
        Meet Sentinela <ArrowUpRight aria-hidden="true" />
      </button>
      <footer>
        <span>Sentinela</span>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
      <LeadCaptureDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
