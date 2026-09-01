import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { webSummitCopy } from "../content/copy";
import { trackWebSummitEvent } from "../analytics/events";

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onFocus: () => void;
  disabled?: boolean;
}

export function PromptComposer({ value, onChange, onSubmit, onFocus, disabled }: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [touched, setTouched] = useState(false);
  const error = touched && !value.trim() ? "Type a question first." : null;

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
  }, [value]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    const clean = value.trim();
    if (!clean || disabled) return;
    trackWebSummitEvent("websummit_prompt_submit", { length: clean.length });
    onSubmit(clean);
  };

  return (
    <form className="ws-composer" onSubmit={submit} noValidate>
      <label className="ws-sr-only" htmlFor="ws-prompt">Ask Sentinela anything</label>
      <div className="ws-composer__control" data-invalid={Boolean(error)}>
        <textarea
          ref={textareaRef}
          id="ws-prompt"
          value={value}
          rows={1}
          maxLength={800}
          placeholder={webSummitCopy.placeholder}
          onChange={(event) => {
            resizeTextarea(event.currentTarget);
            onChange(event.target.value);
          }}
          onFocus={() => {
            onFocus();
            trackWebSummitEvent("websummit_prompt_focus");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) submit(event);
          }}
          aria-describedby="ws-prompt-note ws-prompt-error"
          aria-invalid={Boolean(error)}
          disabled={disabled}
        />
        <button type="submit" aria-label="Submit prompt" disabled={disabled || !value.trim()}>
          <ArrowUp aria-hidden="true" />
        </button>
      </div>
      <div className="ws-composer__meta">
        <p id="ws-prompt-note">{webSummitCopy.privacyNote}</p>
        <span>{value.length}/800</span>
      </div>
      <p id="ws-prompt-error" className="ws-form-error" role="alert">{error}</p>
    </form>
  );
}

const MAX_TEXTAREA_HEIGHT = 176;

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
}
