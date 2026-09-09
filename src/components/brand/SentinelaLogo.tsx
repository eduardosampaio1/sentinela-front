import { SentinelaMark } from "./SentinelaMark";
import { cn } from "@/lib/utils";

export function SentinelaLogo({
  className,
  markClassName,
  wordmarkClassName,
  markSize = 28,
  luminous = false,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  markSize?: number;
  luminous?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("inline-grid shrink-0 place-items-center", markClassName)} aria-hidden="true">
        <SentinelaMark size={markSize} finish={luminous ? "luminous" : "solid"} decorative />
      </span>
      <span className={wordmarkClassName}>SENTINELA</span>
    </span>
  );
}
