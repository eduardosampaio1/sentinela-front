import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { AuthProvider } from "./contexts/AuthContext";
import { AnalysisProvider } from "./contexts/AnalysisContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <AnalysisProvider>
      <App />
    </AnalysisProvider>
  </AuthProvider>
);