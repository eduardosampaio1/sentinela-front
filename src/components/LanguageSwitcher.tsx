import { useLanguage } from "@/contexts/LanguageContext";

interface LanguageSwitcherProps {
  className?: string;
}

const options = [
  { value: "en", label: "EN" },
] as const;

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/50 px-1.5 py-1 text-[11px] ${className}`.trim()}
      aria-label="Language switcher"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          className={`rounded-full px-2 py-1 font-medium transition-colors ${
            language === option.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
