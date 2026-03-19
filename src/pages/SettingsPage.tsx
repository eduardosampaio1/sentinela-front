import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Database, Globe2, Key, Plug, Settings } from "lucide-react";

export default function SettingsPage() {
  const { workspace } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings className="h-4 w-4 text-muted-foreground" />
            {t("settings.workspace")}
          </h2>
          <div className="max-w-md space-y-2">
            <Label htmlFor="ws-name" className="text-xs text-muted-foreground">
              {t("settings.workspaceName")}
            </Label>
            <Input
              id="ws-name"
              readOnly
              value={workspace?.name ?? t("settings.workspacePlaceholder")}
              className="bg-card border-border/50"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Globe2 className="h-4 w-4 text-muted-foreground" />
            {t("settings.language")}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("settings.languageBody")}
          </p>
          <Badge variant="outline" className="w-fit">
            English
          </Badge>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Database className="h-4 w-4 text-muted-foreground" />
            {t("settings.planUsage")}
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Plan:
              <Badge variant="outline" className="ml-2 text-xs">
                {t("settings.free")}
              </Badge>
            </p>
            <p>
              {t("settings.conversationsUsed")}: <span className="font-medium text-foreground">0</span> / 1,000
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Key className="h-4 w-4 text-muted-foreground" />
            {t("settings.apiKeys")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("settings.apiKeysBody")}</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Plug className="h-4 w-4 text-muted-foreground" />
            {t("settings.integrations")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("settings.integrationsBody")}</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/50 bg-gradient-card p-5">
          <h2 className="text-sm font-semibold text-foreground">{t("settings.dataRetention")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.dataRetentionBody")}</p>
        </section>
      </div>
    </div>
  );
}
