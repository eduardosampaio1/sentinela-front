import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { submitLead, validateLead, type LeadErrors } from "../api/leadApi";
import { trackPublicExperienceEvent } from "../analytics/events";
import { useUtmParams } from "../hooks/useUtmParams";
import { usePublicExperience } from "../usePublicExperience";

interface LeadCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadCaptureDialog({ open, onOpenChange }: LeadCaptureDialogProps) {
  const { copy, locale, variant } = usePublicExperience();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const utm = useUtmParams();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [form, setForm] = useState({ email: "", name: "", company: "", role: "", consent: false, website: "" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    onOpenChange(false);
    if (status !== "success") setStatus("idle");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLead(form, locale);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStatus("submitting");
    trackPublicExperienceEvent(variant, "lead_submit");
    try {
      await submitLead({
        ...form,
        source: "websummit_2026",
        utm,
        referrer: document.referrer.slice(0, 500) || undefined,
        locale,
      });
      setStatus("success");
      trackPublicExperienceEvent(variant, "lead_success");
    } catch {
      setStatus("error");
    }
  };

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <dialog ref={dialogRef} className="ws-lead-dialog" onClose={close} onCancel={close} aria-labelledby="ws-lead-title">
      <div className="ws-lead-dialog__surface">
        <button type="button" className="ws-dialog-close" onClick={close} aria-label={copy.lead.close}><X /></button>
        {status === "success" ? (
          <div className="ws-lead-success" role="status">
            <Check aria-hidden="true" />
            <h2 id="ws-lead-title">{copy.lead.successTitle}</h2>
            <p>{copy.lead.successBody}</p>
            <button type="button" className="ws-primary-action" onClick={close}>{copy.lead.done}</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="ws-lead-title">{copy.lead.title}</h2>
            <p>{copy.lead.body}</p>
            <div className="ws-lead-grid">
              <Field label={copy.lead.email} required error={errors.email}>
                <input type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={254} />
              </Field>
              <Field label={copy.lead.name}>
                <input autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={120} />
              </Field>
              <Field label={copy.lead.company}>
                <input autoComplete="organization" value={form.company} onChange={(e) => update("company", e.target.value)} maxLength={160} />
              </Field>
              <Field label={copy.lead.role}>
                <input autoComplete="organization-title" value={form.role} onChange={(e) => update("role", e.target.value)} maxLength={120} />
              </Field>
            </div>
            <input className="ws-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => update("website", e.target.value)} />
            <label className="ws-consent">
              <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} />
              <span>{copy.lead.consentPrefix} <a href="/privacy">{copy.lead.privacyPolicy}</a>.</span>
            </label>
            {errors.consent && <p className="ws-form-error" role="alert">{errors.consent}</p>}
            {status === "error" && <p className="ws-submit-error" role="alert">{copy.lead.failure}</p>}
            <button className="ws-primary-action ws-lead-submit" disabled={status === "submitting"}>
              {status === "submitting" ? <span className="ws-submit-signal">{copy.lead.submitting}</span> : copy.lead.submit}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactElement }) {
  return (
    <label className="ws-field">
      <span>{label}{required ? " *" : ""}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
