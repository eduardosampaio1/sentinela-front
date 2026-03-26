import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnalysisProvider } from "@/contexts/AnalysisContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AnalysisProvider>
          {children}
          <Toaster />
        </AnalysisProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
