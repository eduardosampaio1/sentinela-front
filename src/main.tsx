// A porta de navegação manual precisa correr ANTES de tudo: ela decide o valor que o cadeado
// abaixo vai ler. Import estático de efeito colateral roda antes do corpo deste módulo.
import "./dev/navegacaoManual";
// A massa vem DEPOIS da porta e ANTES do MSW: ela só semeia se a marca da porta já estiver
// gravada, e o handler da listagem lê `sessionStorage` na hora do pedido.
import "./dev/massaDeNavegacao";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { limparResultadosLegadosDoNavegador } from "./lib/legacyBrowserStorage";
// Vocabulário canônico PRIMEIRO: `styles/globals.css` só contém aliases para estes papéis.
import "./design/tokens/tokens.css";
import "./styles/globals.css";

const isWebSummitEntry = window.location.pathname.replace(/\/+$/, "") === "/websummit";

// A limpeza pertence ao produto autenticado. A experiência pública não lê nem altera esse estado.
if (!isWebSummitEntry) limparResultadosLegadosDoNavegador();

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

async function renderProductApp() {
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

async function renderWebSummitApp() {
  const { WebSummitPage } = await import("./features/websummit/WebSummitPage");
  root.render(
    <StrictMode>
      <WebSummitPage />
    </StrictMode>,
  );
}

function e2eAuthRequested(): boolean {
  try {
    return typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ === true;
  } catch {
    return false;
  }
}

async function arrancarMockSePedido(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { mockLigado, iniciarMockDoBrowser } = await import("./mocks/browser");
  if (mockLigado()) await iniciarMockDoBrowser();
}

if (isWebSummitEntry) {
  void renderWebSummitApp();
} else {
  loadProductFonts();
  if (import.meta.env.DEV && import.meta.env.VITE_E2E === "true" && e2eAuthRequested()) {
    import("./e2e/bypass")
      .then(({ installE2EBypass }) => installE2EBypass())
      .finally(renderProductApp);
  } else {
    void arrancarMockSePedido().finally(renderProductApp);
  }
}
