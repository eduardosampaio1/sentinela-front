import { memo, type CSSProperties } from "react";
import type { ExperienceDecision, ExperienceState } from "../experience/types";

const checks = [
  { key: "INTENT", x: 348, path: "M348 132C348 220 432 226 506 282" },
  { key: "RISK", x: 510, path: "M510 104C510 194 540 230 562 268" },
  { key: "CONTEXT", x: 690, path: "M690 104C690 194 660 230 638 268" },
  { key: "COST", x: 852, path: "M852 132C852 220 768 226 694 282" },
] as const;

export const SentinelaDecisionField = memo(function SentinelaDecisionField({ state, decision }: {
  state: ExperienceState;
  decision?: ExperienceDecision;
}) {
  const readings = [
    "PURPOSE READ",
    decision?.risk ? decision.risk.toUpperCase() : "CHECKED",
    compactValue(decision?.contextStrategy ?? "CONTEXT FIT"),
    decision?.llmRequired === false ? "MODEL BYPASSED" : "ROUTE MATCHED",
  ];
  const route = decision?.risk === "high"
    ? "HUMAN REVIEW"
    : decision?.llmRequired === false
      ? "SAFE BYPASS"
      : compactValue(decision?.route ?? "CONTROLLED OUTPUT");

  return (
    <div
      className="ws-decision-field"
      data-state={state}
      data-risk={decision?.risk ?? "unknown"}
      data-llm-required={decision?.llmRequired == null ? "unknown" : String(decision.llmRequired)}
    >
      <p className="ws-sr-only">
        Sentinela reads intent, risk, context and cost before it releases one controlled route.
      </p>

      <div className="ws-decision-field__scene" aria-hidden="true">
        <div className="ws-decision-field__edge ws-decision-field__edge--input"><span>REQUEST</span><i /></div>

        <svg viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="ws-chamber-route" x1="0" x2="1">
              <stop offset="0" stopColor="#315c78" stopOpacity="0.18" />
              <stop offset="0.48" stopColor="#bceaff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#4ba9e8" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="ws-chamber-aura">
              <stop offset="0" stopColor="#dff6ff" stopOpacity="0.34" />
              <stop offset="0.38" stopColor="#5eb9ed" stopOpacity="0.14" />
              <stop offset="1" stopColor="#071019" stopOpacity="0" />
            </radialGradient>
            <filter id="ws-chamber-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g className="ws-decision-field__architecture">
            <ellipse cx="600" cy="320" rx="420" ry="238" />
            <ellipse cx="600" cy="320" rx="322" ry="182" />
            <ellipse cx="600" cy="320" rx="222" ry="124" />
            <path d="M88 320H1112" />
            <path d="M600 56V568" />
          </g>

          <g className="ws-decision-field__routes">
            <path className="ws-decision-field__route ws-decision-field__route--input" d="M74 320C210 320 330 320 478 320" />
            {checks.map((check) => <path className="ws-decision-field__route ws-decision-field__route--check" d={check.path} key={check.key} />)}
            <path className="ws-decision-field__route ws-decision-field__route--output" d="M722 320C858 320 950 320 1128 320" />
          </g>

          <g className="ws-decision-field__check-nodes">
            {checks.map((check, index) => (
              <g
                key={check.key}
                style={{ "--ws-check-index": index } as CSSProperties}
                transform={`translate(${check.x} ${index === 0 || index === 3 ? 132 : 104})`}
              >
                <circle className="ws-decision-field__check-aura" r="28" />
                <circle className="ws-decision-field__check-ring" r="12" />
                <circle className="ws-decision-field__check-point" r="3" />
              </g>
            ))}
          </g>

          <g className="ws-decision-field__aperture" transform="translate(600 320)">
            <circle className="ws-decision-field__aperture-aura" r="176" fill="url(#ws-chamber-aura)" />
            <circle className="ws-decision-field__aperture-orbit ws-decision-field__aperture-orbit--outer" r="116" />
            <circle className="ws-decision-field__aperture-orbit ws-decision-field__aperture-orbit--inner" r="92" />
            <g className="ws-decision-field__iris">
              <path d="M0-78C34-78 61-60 76-34L31-18C22-31 12-38 0-40Z" />
              <path d="M78 0C78 34 60 61 34 76L18 31C31 22 38 12 40 0Z" />
              <path d="M0 78C-34 78-61 60-76 34L-31 18C-22 31-12 38 0 40Z" />
              <path d="M-78 0C-78-34-60-61-34-76L-18-31C-31-22-38-12-40 0Z" />
            </g>
            <path className="ws-decision-field__aperture-core" d="M0-37 32-19 32 19 0 37-32 19-32-19Z" />
            <circle className="ws-decision-field__aperture-point" r="5" />
          </g>

          <g className="ws-decision-field__packets" filter="url(#ws-chamber-glow)">
            <circle className="ws-decision-field__packet ws-decision-field__packet--input" r="5" />
            {checks.map((check, index) => <circle className={`ws-decision-field__packet ws-decision-field__packet--check ws-decision-field__packet--check-${index + 1}`} key={check.key} r="4" />)}
            <circle className="ws-decision-field__packet ws-decision-field__packet--output" r="5" />
          </g>
        </svg>

        <div className="ws-decision-field__checks">
          {checks.map((check, index) => (
            <div className="ws-decision-field__check" key={check.key} style={{ "--ws-check-index": index } as CSSProperties}>
              <strong>{check.key}</strong><span>{readings[index]}</span>
            </div>
          ))}
        </div>

        <div className="ws-decision-field__decision"><small>RELEASED ROUTE</small><strong>{route}</strong></div>
        <div className="ws-decision-field__edge ws-decision-field__edge--output"><i /><span>OUTPUT</span></div>
        <div className="ws-decision-field__scan" />
      </div>
    </div>
  );
});

function compactValue(value: string) {
  return value.replace(/[-_.]+/g, " ").trim().toUpperCase().split(/\s+/).slice(0, 3).join(" ");
}
