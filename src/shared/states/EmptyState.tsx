import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const padding = size === "sm" ? "py-8 px-4" : size === "lg" ? "py-20 px-8" : "py-14 px-6";
  const iconSize = size === "sm" ? "w-10 h-10" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const titleSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        padding,
        className
      )}
    >
      {/* Icon */}
      {icon ? (
        <div
          className={cn(
            iconSize,
            "flex items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] mb-5 text-[#475569]"
          )}
        >
          {icon}
        </div>
      ) : (
        <div
          className={cn(
            iconSize,
            "flex items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] mb-5"
          )}
        >
          <svg
            className="w-5 h-5 text-[#475569]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
            />
          </svg>
        </div>
      )}

      {/* Text */}
      <h3 className={cn(titleSize, "font-semibold text-[#F1F5F9] mb-2")}>{title}</h3>
      {description && (
        <p className="text-sm text-[#475569] max-w-sm leading-relaxed mb-6">{description}</p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant ?? "default"}
              size="sm"
              className="rounded-xl"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="sm"
              className="rounded-xl text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
