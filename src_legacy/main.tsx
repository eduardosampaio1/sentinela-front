import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisProvider } from "./contexts/AnalysisContext";
import { LanguageProvider } from "./contexts/LanguageContext";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <AuthProvider>
      <AnalysisProvider>
        <App />
      </AnalysisProvider>
    </AuthProvider>
  </LanguageProvider>
);
