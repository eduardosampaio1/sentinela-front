import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LanguageProvider>
      <AuthProvider>
        {/* `AnalysisProvider` SAIU. Ele guardava `result` (só o cache do navegador o
            preenchia) e `hasHistory` (autorização indireta para mostrar resultado).
            Sem os dois, o provider não tinha o que prover. */}
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
