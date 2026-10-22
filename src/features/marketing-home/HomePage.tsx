import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePublicExperience } from "../public-experience/usePublicExperience";
import { useExperienceState } from "../public-experience/hooks/useExperienceState";
import { homeContent } from "./content";
import "./home.css";
import { HomeLeadDialog } from "./HomeLeadDialog";
import type { HomeProduct } from "./homeLeadApi";

const contact = (subject: string) =>
  `mailto:hello@sentinela.ai?subject=${encodeURIComponent(subject)}`;
const Arrow = () => <span aria-hidden="true">↗</span>;

// Marketing exception approved by the owner: Web Summit display fonts,
// mineral paper and contrasting chapters. Signal Purple remains the brand accent.
export function HomePage() {
  const { locale, setLocale } = usePublicExperience();
  const c = homeContent[locale];
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadProducts, setLeadProducts] = useState<HomeProduct[]>([]);
  const openLead = (products: HomeProduct[] = []) => {
    setLeadProducts(products);
    setLeadOpen(true);
  };
  useEffect(() => {
    const title =
      locale === "pt-BR"
        ? "Sentinela | Entenda, controle e acompanhe sua IA"
        : "Sentinela | Understand, control and track your AI";
    document.title = title;
    document.documentElement.lang = locale;
    const entries = {
      'meta[name="description"]': c.intro,
      'meta[property="og:title"]': title,
      'meta[property="og:description"]': c.intro,
      'meta[property="og:locale"]': locale === "pt-BR" ? "pt_BR" : "en_US",
      'meta[name="twitter:title"]': title,
      'meta[name="twitter:description"]': c.intro,
    };
    Object.entries(entries).forEach(([selector, content]) =>
      document.head.querySelector(selector)?.setAttribute("content", content),
    );
  }, [locale, c]);

  return (
    <div className="sh-page">
      <a className="sh-skip" href="#home-main">
        {c.skip}
      </a>
      <header className="sh-nav">
        <a className="sh-brand" href="/" aria-label="Sentinela">
          <img src="/sentinela/mark-purple.svg" width="29" height="29" alt="" />
          <span>SENTINELA</span>
        </a>
        <nav aria-label={c.solutions}>
          <a href="#solutions">{c.solutions}</a>
          <a href="#experience">{c.experience}</a>
          <a href="#assessment">AI Assessment</a>
        </nav>
        <div className="sh-nav-actions">
          <button
            type="button"
            aria-label={
              locale === "pt-BR" ? "Switch to English" : "Mudar para português"
            }
            onClick={() => setLocale(locale === "pt-BR" ? "en" : "pt-BR")}
          >
            {locale === "pt-BR" ? "EN" : "PT"}
          </button>
          <a className="sh-login" href="/login">
            {c.login} <Arrow />
          </a>
        </div>
      </header>
      <main id="home-main">
        <section className="sh-hero" aria-labelledby="home-title">
          <div className="sh-hero-grid" aria-hidden="true" />
          <div className="sh-orbit" aria-hidden="true">
            <div className="sh-orbit-ring" />
            <div className="sh-orbit-ring" />
            <div className="sh-orbit-ring" />
            <img
              src="/sentinela/mark-purple.svg"
              width="100"
              height="100"
              alt=""
            />
            <i />
            <i />
            <i />
          </div>
          <div className="sh-eyebrow">
            <i />
            {c.eyebrow}
          </div>
          <h1 id="home-title">
            {c.headline.map((line, i) => (
              <span
                key={line}
                className={
                  i === 1 ? "sh-outline" : i === 3 ? "sh-last-line" : ""
                }
              >
                {line}
              </span>
            ))}
          </h1>
          <div className="sh-hero-bottom">
            <div>
              <p>{c.intro}</p>
              <div className="sh-actions">
                <a className="sh-button" href="#solutions">
                  {c.explore} <span aria-hidden="true">↓</span>
                </a>
                <a className="sh-text-link" href={contact(c.mail)}>
                  {c.contact} <Arrow />
                </a>
              </div>
            </div>
            <div className="sh-hero-index">
              <span>{c.heroNote}</span>
              <a href="#observability">
                01 / AI OBSERVABILITY <Arrow />
              </a>
              <a href="#control">
                02 / AI CONTROL <Arrow />
              </a>
              <a href="#radar">
                03 / BRAND RADAR <Arrow />
              </a>
            </div>
          </div>
          <a className="sh-scroll" href="#solutions">
            <span>{c.scroll}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section
          id="solutions"
          className="sh-portfolio"
          aria-labelledby="solutions-title"
        >
          <div className="sh-section-heading">
            <span className="sh-label">{c.portfolio}</span>
            <h2 id="solutions-title">{c.portfolioTitle}</h2>
          </div>
          <div className="sh-product-directory">
            {c.products.map((p, i) => (
              <a href={`#${p.id}`} key={p.id}>
                <span className="sh-label">
                  0{i + 1} / {p.verb}
                </span>
                <span>{p.name}</span>
                <Arrow />
              </a>
            ))}
          </div>
        </section>

        {c.products.map((p, i) => (
          <section
            key={p.id}
            id={p.id}
            className={`sh-product sh-product-${p.id}`}
            aria-labelledby={`${p.id}-title`}
          >
            <div className="sh-product-copy">
              <span className="sh-label">
                0{i + 1} / {p.name}
              </span>
              <h2 id={`${p.id}-title`}>{p.title}</h2>
              <p>{p.description}</p>
              <ul>
                {p.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                className="sh-text-link"
                onClick={() =>
                  openLead([
                    {
                      observability: "ai_observability",
                      control: "ai_control",
                      radar: "brand_radar",
                    }[p.id] as HomeProduct,
                  ])
                }
              >
                {p.action} <Arrow />
              </button>
            </div>
            <figure className="sh-instrument">
              <div className="sh-instrument-top">
                <span>{p.name.toUpperCase()}</span>
                <span aria-hidden="true">0{i + 1}</span>
              </div>
              <ProductDiagram kind={p.id} labels={p.preview} />
              <p className="sh-instrument-caption">{p.note}</p>
              <figcaption>{c.example}</figcaption>
            </figure>
          </section>
        ))}

        <section className="sh-evidence" aria-labelledby="evidence-title">
          <span className="sh-label">{c.evidenceLabel}</span>
          <h2 id="evidence-title">{c.evidenceTitle}</h2>
          <div>
            <p>{c.evidenceBody}</p>
            <aside>
              <span className="sh-label">{c.review}</span>
              <p>{c.reviewBody}</p>
            </aside>
          </div>
        </section>
        <HomeDemo />
        <section
          id="assessment"
          className="sh-assessment"
          aria-labelledby="assessment-title"
        >
          <span className="sh-label">AI ASSESSMENT / {c.assessmentLabel}</span>
          <h2 id="assessment-title">{c.assessmentTitle}</h2>
          <div>
            <p>{c.assessmentBody}</p>
            <button
              type="button"
              className="sh-button"
              onClick={() => openLead()}
            >
              {c.assessmentAction} <Arrow />
            </button>
            <p className="sh-register">
              {c.assessmentSecondary}{" "}
              <a href="/register">
                {c.register} <Arrow />
              </a>
            </p>
          </div>
        </section>
      </main>
      <HomeLeadDialog
        open={leadOpen}
        initialProducts={leadProducts}
        onClose={() => setLeadOpen(false)}
      />
      <footer className="sh-footer">
        <a className="sh-brand" href="/" aria-label="Sentinela">
          <img src="/sentinela/mark-purple.svg" width="28" height="28" alt="" />
          <span>SENTINELA</span>
        </a>
        <p>{c.footer}</p>
        <nav
          aria-label={
            locale === "pt-BR" ? "Informações legais" : "Legal information"
          }
        >
          <a href="/privacy">{c.privacyLink}</a>
          <a href="/terms">{c.terms}</a>
          <a href={contact(c.mail)}>{c.contact}</a>
        </nav>
        <small>© {new Date().getFullYear()} Sentinela</small>
      </footer>
    </div>
  );
}

function ProductDiagram({ kind, labels }: { kind: string; labels: string[] }) {
  const element = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={element}
      data-animate={visible}
      className={`sh-diagram sh-diagram-${kind}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 480 260" fill="none">
        <path
          className="sh-diagram-grid"
          d="M0 65H480M0 130H480M0 195H480M80 0V260M160 0V260M240 0V260M320 0V260M400 0V260"
        />
        {kind === "observability" ? (
          <>
            <path
              className="sh-data-line sh-data-line-muted"
              d="M0 160L40 150L80 160L120 130L160 140L200 115L240 125L280 100L320 115L360 90L400 100L440 70L480 80"
            />
            <path
              className="sh-data-line"
              d="M0 185L40 165L80 175L120 105L160 125L200 140L240 85L280 110L320 65L360 95L400 55L440 75L480 35"
            />
            <circle cx="320" cy="65" r="7" className="sh-node" />
            <path className="sh-guide" d="M320 65V225M320 65H450" />
          </>
        ) : kind === "control" ? (
          <>
            <path
              className="sh-data-line sh-data-line-muted"
              d="M50 130H155L250 55H430M155 130L250 205H430"
            />
            <rect
              x="325"
              y="37"
              width="110"
              height="36"
              rx="3"
              className="sh-route-option"
            />
            <rect
              x="325"
              y="187"
              width="110"
              height="36"
              rx="3"
              className="sh-route-option"
            />
            <path className="sh-data-line" d="M50 130H430" />
            <circle cx="50" cy="130" r="5" className="sh-control-packet" />
            <circle cx="155" cy="130" r="38" className="sh-policy-ring" />
            <circle cx="155" cy="130" r="28" className="sh-node" />
            <path
              d="M145 130l7 7 13-15"
              className="sh-check sh-control-check"
            />
            <rect
              x="280"
              y="107"
              width="120"
              height="46"
              rx="3"
              className="sh-route-backplate"
            />
            <rect
              x="280"
              y="107"
              width="120"
              height="46"
              rx="3"
              className="sh-route"
            />
            <text
              x="340"
              y="133"
              textAnchor="middle"
              className="sh-route-label"
            >
              {labels[2]}
            </text>
          </>
        ) : (
          <>
            <circle cx="240" cy="130" r="100" className="sh-radar-ring" />
            <circle cx="240" cy="130" r="65" className="sh-radar-ring" />
            <circle cx="240" cy="130" r="30" className="sh-radar-ring" />
            <path className="sh-guide" d="M240 15V245M125 130H355" />
            <g className="sh-radar-sweep">
              <path
                className="sh-radar-sector"
                d="M240 130L240 30A100 100 0 0 1 290 43.4Z"
              />
              <path className="sh-data-line" d="M240 130V30" />
            </g>
            <circle
              cx="287"
              cy="89"
              r="12"
              className="sh-radar-hit sh-radar-hit-a"
            />
            <circle
              cx="180"
              cy="155"
              r="12"
              className="sh-radar-hit sh-radar-hit-b"
            />
            <circle
              cx="260"
              cy="205"
              r="12"
              className="sh-radar-hit sh-radar-hit-c"
            />
            <circle cx="287" cy="89" r="7" className="sh-node" />
            <circle cx="180" cy="155" r="5" className="sh-node" />
            <circle cx="260" cy="205" r="4" className="sh-node" />
          </>
        )}
      </svg>
      <div className="sh-diagram-labels">
        {labels.map((label, i) => (
          <span key={label}>
            0{i + 1} / {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HomeDemo() {
  const { locale } = usePublicExperience();
  const c = homeContent[locale];
  const [prompt, setPrompt] = useState("");
  const [compare, setCompare] = useState<"without" | "with">("with");
  const experience = useExperienceState(locale);
  const busy = ["understanding", "deciding", "responding"].includes(
    experience.phase,
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim() && !busy) void experience.submit(prompt.trim());
  };
  return (
    <section className="sh-demo" id="experience" aria-labelledby="demo-title">
      <div className="sh-demo-intro">
        <span className="sh-label">{c.demoLabel}</span>
        <h2 id="demo-title">{c.demoTitle}</h2>
        <p>{c.demoBody}</p>
      </div>
      <div className="sh-demo-panel">
        <form onSubmit={submit}>
          <label className="sh-label" htmlFor="home-prompt">
            {c.promptLabel}
          </label>
          <textarea
            id="home-prompt"
            maxLength={800}
            rows={3}
            placeholder={c.placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <small>{c.privacy}</small>
          <button className="sh-button" disabled={busy || !prompt.trim()}>
            {busy ? c.busy : c.send} <Arrow />
          </button>
        </form>
        <div className="sh-examples">
          {c.examples.map((example, i) => (
            <button
              key={example}
              type="button"
              disabled={busy}
              onClick={() => {
                setPrompt(example);
                void experience.submit(example);
              }}
            >
              0{i + 1} / {example} <Arrow />
            </button>
          ))}
        </div>
        <div className="sh-demo-status" role="status">
          {busy && c.busy}
          {experience.result && (
            <>
              <span className="sh-label">{c.result}</span>
              <p>{experience.result.answer}</p>
              <ol>
                {experience.result.trace.map((step) => (
                  <li key={step.stage}>
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </li>
                ))}
              </ol>
              <small>
                {experience.result.illustrative
                  ? c.demoNote
                  : locale === "pt-BR"
                    ? "Trilha de decisão gerada pela Sentinela."
                    : "Decision trace generated by Sentinela."}
              </small>
            </>
          )}
          {experience.error && <p role="alert">{c.demoError}</p>}
        </div>
        <p className="sh-demo-note">{c.demoNote}</p>
      </div>
      <div className="sh-comparison">
        <h3>{c.compareTitle}</h3>
        <div
          className="sh-comparison-options"
          role="group"
          aria-label={c.compareTitle}
        >
          <button
            type="button"
            aria-pressed={compare === "without"}
            onClick={() => setCompare("without")}
          >
            {c.without}
          </button>
          <button
            type="button"
            aria-pressed={compare === "with"}
            onClick={() => setCompare("with")}
          >
            {c.with}
          </button>
        </div>
        <ul>
          {(compare === "with" ? c.withItems : c.withoutItems).map((item) => (
            <li key={item}>
              <span aria-hidden="true">{compare === "with" ? "↗" : "—"}</span>
              {item}
            </li>
          ))}
        </ul>
        <small>{c.demoNote}</small>
      </div>
    </section>
  );
}
