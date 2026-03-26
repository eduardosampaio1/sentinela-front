interface MissingDataBadgeProps {
  label?: string;
}

export default function MissingDataBadge({ label = "Not provided by engine" }: MissingDataBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-border/50 bg-muted/35 px-2 py-0.5 text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
      {label}
    </span>
  );
}
