import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionPanelProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export default function AccordionPanel({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
  className,
}: AccordionPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section className={cn("rounded-[22px] border border-border/50 bg-card/55 shadow-sm backdrop-blur-md", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/35 text-muted-foreground">
              {icon}
            </span>
          ) : null}
          <p className="truncate text-sm font-medium text-foreground sm:text-[0.95rem]">{title}</p>
        </div>

        <div className="flex items-center gap-2">
          {badge ? <div className="shrink-0">{badge}</div> : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-250",
              open ? "rotate-180" : "rotate-0",
            )}
          />
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0.94 }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

