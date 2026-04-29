import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Navbar = () => {
  const { t } = useLanguage();

  return (
    <nav className="fixed top-3 left-4 right-4 sm:left-6 sm:right-6 z-50 glass border border-border/50 rounded-2xl shadow-card">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm">
            <Eye className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-lg font-display">Sentinela</span>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.whyNow")}
          </a>
          <a href="#detection" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.detection")}
          </a>
          <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.workflow")}
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.pricing")}
          </a>
          <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.security")}
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
              {t("common.login")}
            </Button>
          </Link>
          <Link to="/login?demo=1">
            <Button variant="outline" size="sm" className="border-border/60 bg-card/40 hover:bg-card/70">
              {t("common.tryDemo")}
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              {t("common.startFree")}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
