import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Key, Plug, Database } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Workspace */}
      <div className="p-5 rounded-xl border border-border/50 bg-gradient-card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" /> Workspace
        </h3>
        <div className="space-y-2 max-w-md">
          <Label htmlFor="ws-name" className="text-xs text-muted-foreground">Workspace Name</Label>
          <Input id="ws-name" defaultValue="My Workspace" className="bg-card border-border/50" />
        </div>
      </div>

      {/* Plan & Usage */}
      <div className="p-5 rounded-xl border border-border/50 bg-gradient-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" /> Plan & Usage
        </h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Plan: <Badge variant="outline" className="text-xs ml-1">Free</Badge></p>
          <p>Conversations used: <span className="text-foreground font-medium">0</span> / 1,000</p>
        </div>
      </div>

      {/* API Keys */}
      <div className="p-5 rounded-xl border border-border/50 bg-gradient-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" /> API Keys
        </h3>
        <p className="text-xs text-muted-foreground">Not configured. API key management will be available in a future update.</p>
      </div>

      {/* Integrations */}
      <div className="p-5 rounded-xl border border-border/50 bg-gradient-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plug className="w-4 h-4 text-muted-foreground" /> Integrations
        </h3>
        <p className="text-xs text-muted-foreground">No integrations configured. Connect external services like Slack, Datadog, or custom webhooks.</p>
      </div>

      {/* Data Retention */}
      <div className="p-5 rounded-xl border border-border/50 bg-gradient-card space-y-3">
        <h3 className="text-sm font-semibold">Data Retention</h3>
        <p className="text-xs text-muted-foreground">Analysis data is stored locally in your browser. No data is sent to external servers beyond the analysis API call.</p>
      </div>
    </div>
  );
};

export default SettingsPage;
