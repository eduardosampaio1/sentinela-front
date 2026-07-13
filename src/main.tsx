import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "./app/providers";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/globals.css";

// When a new deploy changes chunk hashes, cached HTML references stale filenames.
// Reload once so the browser fetches the fresh index.html with correct chunk URLs.
window.addEventListener("vite:preloadError", () => {
  const key = "__chunk_reload__";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
