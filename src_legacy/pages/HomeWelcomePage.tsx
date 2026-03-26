import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Layers3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { hasUserAnalysisRuns } from "@/lib/analysisRuns";

export default function HomeWelcomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [checkingUsage, setCheckingUsage] = useState(true);
  const quickScanButtonClass = "w-full justify-start bg-[#01BBF6] text-white hover:bg-[#00a8de]";
  const deepAnalysisButtonClass = "w-full justify-start bg-[#0186AF] text-white hover:bg-[#01779c]";

  useEffect(() => {
    if (!user?.id) {
      setCheckingUsage(false);
      return;
    }

    let active = true;
    setCheckingUsage(true);
    void hasUserAnalysisRuns(user.id)
      .then((hasUsage) => {
        if (!active) return;
        if (hasUsage) {
          navigate("/home", { replace: true });
        }
      })
      .finally(() => {
        if (active) {
          setCheckingUsage(false);
        }
      });

    return () => {
      active = false;
    };
  }, [navigate, user?.id]);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (checkingUsage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          Preparing first access...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-primary">Sentinela</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">Welcome</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </header>

        <section className="rounded-3xl border border-border bg-card/80 p-7 shadow-sm">
          <h2 className="text-3xl font-semibold text-foreground">
            Your first analysis: Quick Scan or Deep Analysis?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start with a rapid signal using Quick Scan, or choose Deep Analysis to define project,
            system, and environment before running a full dataset analysis.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Button className={quickScanButtonClass} onClick={() => navigate("/quick-scan")}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Quick Scan
            </Button>
            <Button className={deepAnalysisButtonClass} onClick={() => navigate("/home/deep")}>
              <Layers3 className="mr-2 h-4 w-4" />
              Deep Analysis
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
