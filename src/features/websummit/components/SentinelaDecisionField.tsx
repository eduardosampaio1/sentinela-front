import { memo } from "react";
import type { ExperienceState } from "../experience/types";

const signals = ["INTENT", "RISK", "CONTEXT", "COST"] as const;
const activities = ["INTENT READ", "RISK CLEAR", "CONTEXT FIT", "ROUTE READY"] as const;

export const SentinelaDecisionField = memo(function SentinelaDecisionField({ state }: { state: ExperienceState }) {
  return (
    <div className="ws-decision-field" data-state={state}>
      <p className="ws-sr-only">
        Sentinela receives a request, evaluates intent, risk, context and cost, then releases a controlled action.
      </p>
      <svg viewBox="0 0 1000 680" role="img" aria-labelledby="ws-decision-field-title">
        <title id="ws-decision-field-title">A live Sentinela decision from request to controlled action</title>
        <defs>
          <linearGradient id="ws-route-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#376b8f" stopOpacity="0.18" />
            <stop offset="0.52" stopColor="#86c9f4" stopOpacity="0.92" />
            <stop offset="1" stopColor="#52a8e8" stopOpacity="0.22" />
          </linearGradient>
          <radialGradient id="ws-core-gradient">
            <stop offset="0" stopColor="#9ad8ff" stopOpacity="0.58" />
            <stop offset="0.45" stopColor="#287db8" stopOpacity="0.2" />
            <stop offset="1" stopColor="#07101a" stopOpacity="0" />
          </radialGradient>
          <filter id="ws-route-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="ws-decision-field__grid">
          <path d="M80 144H920M80 264H920M80 384H920M80 504H920" />
          <path d="M180 76V604M340 76V604M500 76V604M660 76V604M820 76V604" />
        </g>

        <g className="ws-decision-field__routes">
          <path className="ws-decision-field__route ws-decision-field__route--input" d="M82 340C170 340 210 340 292 340C362 340 394 340 438 340" />
          <path className="ws-decision-field__route" d="M244 152C318 152 342 222 454 300" />
          <path className="ws-decision-field__route" d="M390 112C410 194 430 246 470 292" />
          <path className="ws-decision-field__route" d="M610 112C590 194 570 246 530 292" />
          <path className="ws-decision-field__route" d="M756 152C682 152 658 222 546 300" />
          <path className="ws-decision-field__route ws-decision-field__route--output" d="M562 340C648 340 684 340 734 340C810 340 846 290 918 290" />
          <path className="ws-decision-field__route ws-decision-field__route--secondary" d="M562 340C648 340 684 340 734 340C810 340 846 390 918 390" />
        </g>

        <g className="ws-decision-field__signal-nodes">
          {[244, 390, 610, 756].map((x, index) => (
            <g key={signals[index]} transform={`translate(${x} ${index === 0 || index === 3 ? 152 : 112})`}>
              <circle r="10" />
              <circle className="ws-decision-field__pulse" r="18" />
            </g>
          ))}
        </g>

        <g className="ws-decision-field__core" transform="translate(500 340)">
          <circle className="ws-decision-field__core-aura" r="124" fill="url(#ws-core-gradient)" />
          <path d="M0-66 57-33 57 33 0 66-57 33-57-33Z" />
          <path className="ws-decision-field__core-inner" d="M0-42 36-21 36 21 0 42-36 21-36-21Z" />
          <circle r="5" />
        </g>

        <g className="ws-decision-field__packets" filter="url(#ws-route-glow)">
          <circle className="ws-decision-field__packet ws-decision-field__packet--in" r="4" />
          <circle className="ws-decision-field__packet ws-decision-field__packet--out" r="4" />
        </g>
      </svg>

      <div className="ws-decision-field__sweep" aria-hidden="true" />

      <span className="ws-decision-field__label ws-decision-field__label--request">REQUEST</span>
      <div className="ws-decision-field__signals" aria-hidden="true">
        {signals.map((signal) => <span key={signal}>{signal}</span>)}
      </div>
      <div className="ws-decision-field__decision" aria-hidden="true">
        <span>AI ROUTE</span>
        <span>HUMAN REVIEW</span>
      </div>
      <div className="ws-decision-field__activities" aria-hidden="true">
        {activities.map((activity, index) => (
          <span key={activity} style={{ "--ws-activity-index": index } as React.CSSProperties}>
            <i />
            {activity}
          </span>
        ))}
      </div>
      <div className="ws-decision-field__caption" aria-hidden="true">
        <strong>ONE REQUEST</strong>
        <span>evaluated before execution</span>
      </div>
    </div>
  );
});
