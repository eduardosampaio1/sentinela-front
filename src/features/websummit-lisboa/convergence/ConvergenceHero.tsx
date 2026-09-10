import {
  type FormEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { trackLisboaEvent } from "../analytics/events";
import { stateLabel } from "../hooks/useExperienceMachine";
import type {
  LisboaExperienceResult,
  LisboaExperienceState,
  LisboaTraceStage,
} from "../experience/types";
import { SignalWorld } from "./SignalWorld";

type Props = {
  state: LisboaExperienceState;
  result: LisboaExperienceResult | null;
  onSubmit: (message: string) => void;
  onReset: () => void;
};

const flow: LisboaTraceStage[] = ["understand", "decide", "control", "respond"];

function activeStep(state: LisboaExperienceState) {
  if (["aware", "receiving", "understanding"].includes(state)) return 0;
  if (["evaluating", "deciding"].includes(state)) return 1;
  if (state === "controlling") return 2;
  if (state === "responding") return 3;
  if (["complete", "resting"].includes(state)) return 4;
  return -1;
}

function actionLabel(result: LisboaExperienceResult) {
  if (result.decision.action) return result.decision.action;
  if (result.decision.risk === "high") return "RESTRICT AND ESCALATE";
  if (/deterministic|bypass/i.test(result.decision.route)) return "TAKE THE LIGHTEST ROUTE";
  return "ROUTE WITH CONTROLLED CONTEXT";
}

function traceDetail(result: LisboaExperienceResult, stage: LisboaTraceStage) {
  return result.trace.find((step) => step.stage === stage)?.detail;
}

export function ConvergenceHero({ state, result, onSubmit, onReset }: Props) {
  const [message, setMessage] = useState("");
  const textArea = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 62, damping: 20, mass: 0.72 });
  const springY = useSpring(pointerY, { stiffness: 62, damping: 20, mass: 0.72 });
  const worldX = useTransform(springX, [-1, 1], [32, -32]);
  const worldY = useTransform(springY, [-1, 1], [20, -20]);
  const typeX = useTransform(springX, [-1, 1], [-12, 12]);
  const typeY = useTransform(springY, [-1, 1], [-8, 8]);
  const busy = !["idle", "complete", "resting", "error"].includes(state);
  const current = activeStep(state);

  useEffect(() => {
    if (!textArea.current) return;
    textArea.current.style.height = "1px";
    textArea.current.style.height = `${Math.min(126, Math.max(56, textArea.current.scrollHeight))}px`;
  }, [message]);

  useEffect(() => {
    if (state !== "complete") return;
    textArea.current?.blur();
    window.scrollTo({
      top: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [state, reduced]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = message.trim();
    if (!value || busy) return;
    textArea.current?.blur();
    trackLisboaEvent("prompt_submit");
    onSubmit(value);
  };

  const reset = () => {
    setMessage("");
    onReset();
    window.setTimeout(() => textArea.current?.focus(), 0);
  };

  const move = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - box.left) / box.width - 0.5) * 2);
    pointerY.set(((event.clientY - box.top) / box.height - 0.5) * 2);
  };

  const action = result ? actionLabel(result) : "";

  return (
    <section
      className="wsl-hero"
      id="experience"
      onPointerMove={move}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <div className="wsl-grid" aria-hidden="true" />
      <motion.div className="wsl-world" style={reduced ? undefined : { x: worldX, y: worldY }}>
        <SignalWorld state={state} result={result} />
        <motion.i
          key={state}
          className="wsl-convergence"
          initial={{ scale: 0.08, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="wsl-world-labels" aria-hidden="true">
          <span>INTENT</span><span>RISK</span><span>CONTEXT</span><span>COST</span>
        </div>
      </motion.div>

      <motion.h1 style={reduced ? undefined : { x: typeX, y: typeY }} aria-label="AI shouldn't answer everything">
        {["AI SHOULDN'T", "ANSWER", "EVERYTHING."].map((line, index) => (
          <motion.span
            key={line}
            initial={reduced ? false : { opacity: 0, y: 72, clipPath: "inset(100% 0 0 0)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
            transition={{ duration: 0.9, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {line}
          </motion.span>
        ))}
      </motion.h1>
      <p className="wsl-proposition">
        Sentinela decides what should happen <em>before</em> intelligence becomes action.
      </p>

      <div className="wsl-command">
        <form onSubmit={submit}>
          <label htmlFor="lisboa-convergence-prompt">Put one request under control.</label>
          <div className="wsl-input">
            <textarea
              ref={textArea}
              id="lisboa-convergence-prompt"
              rows={1}
              maxLength={800}
              value={message}
              onFocus={() => trackLisboaEvent("prompt_focus")}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Type anything. Try something consequential."
            />
            <button type="submit" disabled={!message.trim() || busy}>
              <span>ENTER</span><i aria-hidden="true">↗</i>
            </button>
          </div>
          <small>Do not enter confidential or sensitive information.</small>
        </form>

        <div className="wsl-progress" aria-live="polite" aria-label={`System status: ${stateLabel(state)}`}>
          <header><i /><b>{stateLabel(state).toUpperCase()}</b><span>{current < 0 ? "00" : String(Math.min(4, current)).padStart(2, "0")}</span></header>
          <div>{flow.map((step, index) => <span key={step} className={current >= index ? "is-done" : ""}>{step}</span>)}</div>
        </div>
      </div>

      <AnimatePresence>
        {result && ["complete", "resting"].includes(state) && (
          <motion.section
            className="wsl-result"
            initial={reduced ? false : { opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
          >
            <header><span>WHAT SENTINELA DID</span><b>{action}</b></header>
            <h2>{result.answer}</h2>
            <div className="wsl-trace">
              <article><span>01</span><b>Understand</b><p>{result.decision.evidence ?? traceDetail(result, "understand") ?? result.decision.rationale}</p></article>
              <article><span>02</span><b>Decide</b><p>{result.decision.policy ?? traceDetail(result, "decide") ?? result.decision.rationale}</p></article>
              <article><span>03</span><b>Control</b><p>{traceDetail(result, "control") ?? result.decision.contextStrategy}</p></article>
              <article><span>04</span><b>Respond</b><p>{traceDetail(result, "respond") ?? `${action}. Evidence remains attached.`}</p></article>
            </div>
            <footer>
              <small>{result.illustrative ? "Illustrative decision, not a measured customer result." : "Decision trace generated by Sentinela."}</small>
              <button type="button" onClick={reset}>TEST ANOTHER REQUEST ↺</button>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>

      {state === "error" && (
        <div className="wsl-error" role="alert">
          <strong>Sentinela could not complete this request.</strong>
          <span>Try again in a moment. Your message was not stored.</span>
          <button type="button" onClick={reset}>TRY AGAIN</button>
        </div>
      )}
    </section>
  );
}
