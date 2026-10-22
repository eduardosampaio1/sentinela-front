import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePublicExperience } from "../public-experience/usePublicExperience";
import {
  createLeadRequestId,
  homeProducts,
  homeProductNames,
  submitHomeLead,
  type HomeProduct,
} from "./homeLeadApi";

const text = {
  en: {
    title: "Let's talk about your AI.",
    body: "Tell us what you want to understand or improve. We'll contact you about your AI Assessment and the products you're interested in.",
    email: "Work email",
    name: "Name",
    company: "Company",
    optional: "optional",
    products: "Which products are you interested in?",
    all: "All products",
    submit: "Request a conversation",
    saving: "Saving your request…",
    notice: "By clicking “Request a conversation”, you agree to our",
    privacy: "privacy policy",
    emailError: "Enter a valid work email.",
    productsError: "Choose at least one product, or select all.",
    error:
      "We couldn't save your request. Your details are still here. Please try again.",
    success: "Your request is registered.",
    successBody: "You'll receive a confirmation at",
    next: "Our team will contact you at this email address about the next steps.",
    close: "Close form",
    done: "Done",
  },
  "pt-BR": {
    title: "Vamos conversar sobre sua IA.",
    body: "Conte o que você quer entender ou melhorar. Entraremos em contato sobre o AI Assessment e os produtos de seu interesse.",
    email: "E-mail profissional",
    name: "Nome",
    company: "Empresa",
    optional: "opcional",
    products: "Quais produtos interessam a você?",
    all: "Todos os produtos",
    submit: "Solicitar uma conversa",
    saving: "Salvando sua solicitação…",
    notice: "Ao clicar em “Solicitar uma conversa”, você concorda com nossa",
    privacy: "política de privacidade",
    emailError: "Digite um e-mail profissional válido.",
    productsError: "Escolha pelo menos um produto ou selecione todos.",
    error:
      "Não conseguimos salvar sua solicitação. Seus dados continuam aqui. Tente novamente.",
    success: "Sua solicitação foi registrada.",
    successBody: "Você receberá uma confirmação em",
    next: "Nossa equipe entrará em contato por este e-mail para conversar sobre os próximos passos.",
    close: "Fechar formulário",
    done: "Concluir",
  },
};

export function HomeLeadDialog({
  open,
  onClose,
  initialProducts,
}: {
  open: boolean;
  onClose: () => void;
  initialProducts: HomeProduct[];
}) {
  const { locale } = usePublicExperience();
  const c = text[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const lastRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    company: "",
    website: "",
  });
  const [products, setProducts] = useState<HomeProduct[]>(initialProducts);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errors, setErrors] = useState({ email: false, products: false });
  useEffect(() => {
    if (open && !dialog.current?.open) {
      if (status === "success") {
        setStatus("idle");
        setForm({ email: "", name: "", company: "", website: "" });
        lastRequest.current = null;
      }
      setProducts(initialProducts);
      dialog.current?.showModal();
      dialog.current
        ?.querySelector<HTMLInputElement>('input[type="email"]')
        ?.focus();
    }
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open, initialProducts, status]);
  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "email")
      setErrors((current) => ({ ...current, email: false }));
  };
  const select = (next: HomeProduct[]) => {
    setProducts(next);
    setErrors((current) => ({ ...current, products: false }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "submitting") return;
    const next = {
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
      products: products.length === 0,
    };
    setErrors(next);
    if (next.email || next.products) return;
    const payload = {
      email: form.email.trim().toLowerCase(),
      name: form.name.trim() || undefined,
      company: form.company.trim() || undefined,
      products: [...products].sort() as HomeProduct[],
      consent: true as const,
      locale,
      website: form.website,
    };
    const fingerprint = JSON.stringify(payload);
    if (lastRequest.current?.fingerprint !== fingerprint)
      lastRequest.current = { fingerprint, id: createLeadRequestId() };
    setStatus("submitting");
    try {
      await submitHomeLead({ ...payload, request_id: lastRequest.current!.id });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };
  return (
    <dialog
      ref={dialog}
      className="sh-lead-dialog"
      aria-labelledby="sh-lead-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="sh-lead-surface">
        <button
          type="button"
          className="sh-lead-close"
          aria-label={c.close}
          onClick={onClose}
        >
          ×
        </button>
        {status === "success" ? (
          <div className="sh-lead-success" role="status">
            <span className="sh-label">SENTINELA</span>
            <h2 id="sh-lead-title">{c.success}</h2>
            <p>
              {c.successBody} <strong>{form.email.trim()}</strong>.
            </p>
            <p>{c.next}</p>
            <button type="button" className="sh-button" onClick={onClose}>
              {c.done}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <span className="sh-label">AI ASSESSMENT / SENTINELA</span>
            <h2 id="sh-lead-title">{c.title}</h2>
            <p className="sh-lead-intro">{c.body}</p>
            <label className="sh-lead-field" htmlFor="sh-lead-email">
              {c.email} *
              <input
                id="sh-lead-email"
                type="email"
                required
                disabled={status === "submitting"}
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={errors.email}
                aria-describedby={errors.email ? "sh-email-error" : undefined}
              />
              {errors.email && (
                <small id="sh-email-error" role="alert">
                  {c.emailError}
                </small>
              )}
            </label>
            <div className="sh-lead-grid">
              <label className="sh-lead-field" htmlFor="sh-lead-name">
                {c.name} ({c.optional})
                <input
                  id="sh-lead-name"
                  disabled={status === "submitting"}
                  autoComplete="name"
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </label>
              <label className="sh-lead-field" htmlFor="sh-lead-company">
                {c.company} ({c.optional})
                <input
                  id="sh-lead-company"
                  disabled={status === "submitting"}
                  autoComplete="organization"
                  maxLength={160}
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                />
              </label>
            </div>
            <fieldset
              disabled={status === "submitting"}
              className="sh-lead-products"
              aria-describedby={
                errors.products ? "sh-products-error" : undefined
              }
            >
              <legend>{c.products} *</legend>
              <label>
                <input
                  type="checkbox"
                  checked={products.length === homeProducts.length}
                  onChange={(e) =>
                    select(e.target.checked ? [...homeProducts] : [])
                  }
                />
                {c.all}
              </label>
              {homeProducts.map((product) => (
                <label key={product}>
                  <input
                    type="checkbox"
                    checked={products.includes(product)}
                    onChange={(e) =>
                      select(
                        e.target.checked
                          ? [...products, product]
                          : products.filter((p) => p !== product),
                      )
                    }
                  />
                  {homeProductNames[product]}
                </label>
              ))}
              {errors.products && (
                <small id="sh-products-error" role="alert">
                  {c.productsError}
                </small>
              )}
            </fieldset>
            <input
              aria-hidden="true"
              tabIndex={-1}
              autoComplete="off"
              className="sh-lead-honeypot"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
            />
            {status === "error" && (
              <p className="sh-lead-error" role="alert">
                {c.error}
              </p>
            )}
            <button className="sh-button" disabled={status === "submitting"}>
              {status === "submitting" ? c.saving : c.submit}
              <span aria-hidden="true">↗</span>
            </button>
            <p className="sh-lead-privacy">
              {c.notice}{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                {c.privacy}
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}

