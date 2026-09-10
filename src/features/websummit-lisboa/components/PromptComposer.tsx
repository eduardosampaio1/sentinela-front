import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { lisboaScenarios } from "../experience/scenarios";
import { trackLisboaEvent } from "../analytics/events";

interface Props {
  busy: boolean;
  onSubmit: (prompt: string) => void;
}

export function PromptComposer({ busy, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const node = area.current;
    if (!node) return;
    const fit = () => {
      node.style.height = "0px";
      const height = Math.min(node.scrollHeight, 176);
      node.style.height = `${height}px`;
      node.style.overflowY = node.scrollHeight > 176 ? "auto" : "hidden";
    };
    fit();
    const frame = window.requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
    };
  }, [value, busy]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const prompt = value.trim();
    if (!prompt) {
      setError("Enter a message to wake Sentinela.");
      area.current?.focus();
      return;
    }
    setError("");
    trackLisboaEvent("prompt_submit", { length: prompt.length });
    onSubmit(prompt);
  };

  return (
    <div className="lx-composer-wrap">
      <form
        className="lx-composer"
        onSubmit={submit}
        data-invalid={Boolean(error)}
      >
        <label className="lx-sr-only" htmlFor="lisboa-prompt">
          Ask Sentinela anything
        </label>
        <textarea
          ref={area}
          id="lisboa-prompt"
          value={value}
          maxLength={800}
          rows={1}
          disabled={busy}
          placeholder="Ask anything..."
          onFocus={() => trackLisboaEvent("prompt_focus")}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Submit message"
        >
          <ArrowUp aria-hidden="true" />
        </button>
      </form>
      <div className="lx-composer-meta">
        <p>Don't enter confidential or sensitive information.</p>
        <span>{value.length}/800</span>
      </div>
      <p className="lx-input-error" role="alert">
        {error}
      </p>
      <div className="lx-seeds" aria-label="Prompt examples">
        {lisboaScenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            disabled={busy}
            onClick={() => setValue(scenario.prompt)}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </div>
  );
}
