// O formulário de contato.
//
// Único ponto da página que faz rede (Web3Forms) e tem máquina de estado própria — `idle`,
// `submitting`, `success`, `error`. A chave é pública por natureza do serviço.

import { A, display } from "./tokens";
import { Badge } from "./primitivos";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

const WEB3FORMS_KEY = "a7974c9a-965a-4a9b-a29c-f982937d083a";

export function ContactSection() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "AION Demo Request — Sentinela",
          from_name: data.get("name"), email: data.get("email"),
          phone: data.get("phone"), company: data.get("company"),
          team_size: data.get("team_size"), message: data.get("message"),
        }),
      });
      const json = await res.json();
      // M46: era ternário usado como comando, com vírgula-operador no ramo do erro.
      if (json.success) setState("success");
      else { setErrorMsg(json.message ?? "Try again."); setState("error"); }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  const field = (id: string, label: string, type = "text", required = false) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>
        {label}{required && " *"}
      </label>
      <input id={id} name={id} type={type} required={required}
        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
        style={{ background: A.surface, borderColor: A.border, color: A.text }}
        onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
        onBlur={e => (e.currentTarget.style.borderColor = A.border)}
      />
    </div>
  );

  return (
    <section id="contact" className="py-20 sm:py-28 px-6 sm:px-8 relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${A.amber}09 0%, transparent 70%), ${A.surface}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <Badge color={A.amber}>Early Access</Badge>
            <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "1rem", lineHeight: 1.15 }}>
              POC-ready<br />
              <span style={{ color: A.muted, fontWeight: 400 }}>for your team</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: A.muted }}>
              First slots for early adopters are open. If your team runs LLMs in production and wants more control, let's talk.
            </p>
            <div className="space-y-4">
              {[
                "No infrastructure required — runs next to your stack",
                "OpenAI-compatible — no code changes",
                "Integration guide + runbooks included",
                "Your data never leaves your environment",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm" style={{ color: A.muted }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6 sm:p-8" style={{ background: A.bg, borderColor: A.border }}>
            {state === "success" ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${A.primary}18`, border: `1px solid ${A.primary}30` }}>
                  <svg className="w-6 h-6" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: A.text }}>Message sent!</h3>
                <p className="text-sm" style={{ color: A.muted }}>We'll be in touch within 48h.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("name", "Name", "text", true)}
                  {field("email", "Email", "email", true)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("phone", "Phone", "tel")}
                  {field("company", "Company", "text", true)}
                </div>
                <div>
                  <label htmlFor="team_size" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Team size</label>
                  <select id="team_size" name="team_size"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
                    style={{ background: A.surface, borderColor: A.border, color: A.text }}>
                    <option value="">Select…</option>
                    {["1–10", "11–50", "51–200", "201–500", "500+"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Message</label>
                  <textarea id="message" name="message" rows={4}
                    defaultValue="I'd like to learn more about AION for our team."
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors resize-none"
                    style={{ background: A.surface, borderColor: A.border, color: A.text }}
                    onFocus={e => { e.currentTarget.style.borderColor = A.primary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = A.border; }}
                  />
                </div>
                {state === "error" && <p className="text-xs" style={{ color: "#F87171" }}>{errorMsg}</p>}
                <Button type="submit" disabled={state === "submitting"}
                  className="w-full rounded-xl font-semibold h-11"
                  style={{ background: A.primary, color: A.bg, opacity: state === "submitting" ? 0.7 : 1 }}>
                  {state === "submitting" ? "Sending…" : "Send request"}
                </Button>
                <p className="text-xs text-center" style={{ color: A.muted }}>
                  We'll respond within 48h. No sales pitch — just a technical conversation.
                </p>
              </form>
            )}
          </div>
        </div>
        <div className="mt-12 text-center">
          <Link to="/" className="text-sm transition-colors" style={{ color: A.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = A.text)}
            onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
            ← Explore Sentinela — batch analysis
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
