import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4",
        compact ? "mb-5" : "mb-8",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h1
            className={cn(
              "font-semibold tracking-tight text-[#F1F5F9] truncate",
              compact ? "text-xl" : "text-2xl"
            )}
          >
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(79,90,232,0.12)] text-[#4F5AE8] border border-[rgba(79,90,232,0.2)] whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-[#94A3B8] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  label: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  label,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>
      <div>
        <p className="section-label">{label}</p>
        {description && (
          <p className="text-xs text-[#94A3B8] mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
