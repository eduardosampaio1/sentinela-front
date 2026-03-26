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
    <section
      className={cn(
        "dashboard-panel-muted overflow-hidden transition-all duration-300 hover:border-primary/20",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-[72px] w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/45 text-primary shadow-[0_12px_30px_-20px_rgba(34,211,238,0.9)]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="dashboard-kicker">Deep view</p>
            <p className="truncate text-base font-semibold text-foreground sm:text-[1.02rem]">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge ? <div className="shrink-0">{badge}</div> : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-foreground",
              open ? "rotate-180" : "rotate-0",
            )}
          />
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0.9 }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/50 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

