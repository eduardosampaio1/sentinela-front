import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { submitLisboaLead, validateLisboaLead } from "../api/leadApi";
import { trackLisboaEvent } from "../analytics/events";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadCaptureDialog({ open, onOpenChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [form, setForm] = useState({
    email: "",
    name: "",
    company: "",
    website: "",
  });
  const [errors, setErrors] = useState({ email: "", consent: "" });

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const close = () => {
    onOpenChange(false);
    if (status !== "success") setStatus("idle");
  };
  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = validateLisboaLead({ ...form, consent: true });
    setErrors(next);
    if (next.email || next.consent) return;
    setStatus("submitting");
    trackLisboaEvent("lead_submit");
    try {
      // The visitor accepts the visible privacy notice by submitting this request.
      await submitLisboaLead({ ...form, consent: true });
      setStatus("success");
      trackLisboaEvent("lead_success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <dialog
      ref={dialog}
      className="lx-lead-dialog"
      onClose={close}
      onCancel={close}
      aria-labelledby="lx-lead-title"
    >
      <div className="lx-lead-surface">
        <button
          className="lx-close"
          type="button"
          onClick={close}
          aria-label="Close form"
        >
          <X aria-hidden="true" />
        </button>
        {status === "success" ? (
          <div className="lx-lead-success" role="status">
            <Check aria-hidden="true" />
            <h2 id="lx-lead-title">You're registered for your free analysis.</h2>
            <p>We'll email you the next steps to analyze 1 million conversations.</p>
            <button type="button" className="lx-primary" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="lx-lead-title">Analyze 1 million conversations. Free.</h2>
            <p>Register for a batch analysis with AI Observability by Sentinela. We'll email you the next steps.</p>
            <LeadField label="Work email" error={errors.email} required>
              <input
                type="email"
                required
                aria-invalid={Boolean(errors.email)}
                value={form.email}
                autoComplete="email"
                maxLength={254}
                onChange={(e) => update("email", e.target.value)}
              />
            </LeadField>
            <div className="lx-lead-grid">
              <LeadField label="Name">
                <input
                  value={form.name}
                  autoComplete="name"
                  maxLength={120}
                  onChange={(e) => update("name", e.target.value)}
                />
              </LeadField>
              <LeadField label="Company">
                <input
                  value={form.company}
                  autoComplete="organization"
                  maxLength={160}
                  onChange={(e) => update("company", e.target.value)}
                />
              </LeadField>
            </div>
            <input
              className="lx-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
            {status === "error" && (
              <p className="lx-submit-error" role="alert">
                Something went wrong. Your details are still here. Try again in
                a moment.
              </p>
            )}
            <button className="lx-primary" disabled={status === "submitting"}>
              {status === "submitting"
                ? "Saving your request…"
                : "Get my free analysis"}
            </button>
            <p className="lx-privacy-notice">
              By clicking “Get my free analysis”, you agree to our <a href="/privacy">privacy policy</a>.
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}

function LeadField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}) {
  return (
    <label className="lx-field">
      <span>
        {label}
        {required ? " *" : " (optional)"}
      </span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
