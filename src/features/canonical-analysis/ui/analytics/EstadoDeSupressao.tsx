import { useLanguage } from "@/contexts/LanguageContext";

/** "Houve supressão por privacidade" — conclusão do produtor, dita e não explicada. */
export function Suprimido() {
  const { t } = useLanguage();
  return (
    <span className="selo-supr" data-suprimido="true">
      {t("canonicalAnalysis.analyticsView.suppressed")}
    </span>
  );
}
