import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmptyStateProps {
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

const EmptyState = ({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimaryClick,
  onSecondaryClick,
}: EmptyStateProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const resolvedTitle = title ?? t("emptyState.title");
  const resolvedDescription = description ?? t("emptyState.description");
  const resolvedPrimaryLabel = primaryLabel ?? t("emptyState.primary");

  return (
    <div className="p-12 rounded-xl border border-dashed border-border/50 text-center space-y-4">
      <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="text-sm font-medium text-muted-foreground">{resolvedTitle}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{resolvedDescription}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => (onPrimaryClick ? onPrimaryClick() : navigate("/dashboard"))}
        >
          {resolvedPrimaryLabel}
        </Button>
        {secondaryLabel && onSecondaryClick ? (
          <Button variant="ghost" size="sm" onClick={onSecondaryClick}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyState;
