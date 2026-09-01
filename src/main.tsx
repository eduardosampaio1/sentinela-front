import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

const root = createRoot(rootEl);
const isWebSummitEntry = window.location.pathname.replace(/\/+$/, "") === "/websummit";

function loadProductFonts() {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.gstatic.com";
  preconnect.crossOrigin = "anonymous";

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500&display=swap";

  document.head.append(preconnect, stylesheet);
}

async function bootstrap() {
  if (isWebSummitEntry) {
    const { WebSummitPage } = await import("./features/websummit/WebSummitPage");
    root.render(
      <StrictMode>
        <WebSummitPage />
      </StrictMode>,
    );
    return;
  }

  loadProductFonts();
  const [{ Providers }, { App }] = await Promise.all([
    import("./app/providers"),
    import("./app/App"),
  ]);
  root.render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>,
  );
}

void bootstrap();
