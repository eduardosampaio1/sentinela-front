import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageFrameProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  noPadding?: boolean;
}

export function PageFrame({
  children,
  className,
  maxWidth = "2xl",
  noPadding = false,
}: PageFrameProps) {
  const maxWidthClass = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-none",
  }[maxWidth];

  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden",
        !noPadding && "px-6 py-8",
        className
      )}
    >
      <div className={cn("mx-auto w-full", maxWidthClass)}>
        {children}
      </div>
    </main>
  );
}
