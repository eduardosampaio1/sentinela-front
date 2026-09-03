import { Send } from "lucide-react";
import { useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function AskComposer({
  value,
  onChange,
  onSubmit,
  pending,
  placeholder,
  submitLabel,
  privacyNote,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  placeholder: string;
  submitLabel: string;
  privacyNote: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim().length >= 2 && !pending) onSubmit();
  }

  return (
    <form onSubmit={submit} className="border-t border-border bg-background p-4">
      <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 focus-within:ring-2 focus-within:ring-ring">
        <textarea
          ref={ref}
          value={value}
          maxLength={1200}
          rows={1}
          aria-label={placeholder}
          placeholder={placeholder}
          className="max-h-36 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-sm leading-5 outline-none [field-sizing:content]"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (value.trim().length >= 2 && !pending) onSubmit();
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-lg"
          disabled={pending || value.trim().length < 2}
          aria-label={submitLabel}
        >
          <Send aria-hidden />
        </Button>
      </div>
      <div className="mt-2 flex justify-between gap-3 text-[11px] leading-4 text-muted-foreground">
        <span>{privacyNote}</span>
        <span className="tabular-nums">{value.length}/1200</span>
      </div>
    </form>
  );
}
