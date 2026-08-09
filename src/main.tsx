import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "./app/providers";
import { App } from "./app/App";
import { limparResultadosLegadosDoNavegador } from "./lib/legacyBrowserStorage";
// Vocabulario canonico PRIMEIRO: `styles/globals.css` so contem apelidos que apontam para
// estes papeis, e apelido declarado antes do valor nao resolveria.
import "./design/tokens/tokens.css";
import "./styles/globals.css";

// ANTES de qualquer render: apaga as cópias de resultado que a versão anterior deixou no
// navegador. Remover o código que gravava não apaga o que ele já gravou, e essa cópia é a
// única que nenhum purge do servidor alcança.
//
// Não usa `clear()`: só saem as chaves com os prefixos que este app criou. Ver
// `lib/legacyBrowserStorage.ts`.
limparResultadosLegadosDoNavegador();

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

function renderApp() {
  createRoot(rootEl!).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>
  );
}

// CADEADO fail-closed: o bypass de auth E2E só é carregado sob TRÊS condições simultâneas:
//   1. `import.meta.env.DEV` — literal `false` em produção → o `import()` é eliminado e
//      `src/e2e/bypass.ts` (que contém o token fixo) nunca entra no bundle de produção;
//   2. `VITE_E2E === "true"` — marca explícita do dev server sob Playwright;
//   3. opt-in por teste (`window.__SENTINELA_E2E_AUTH__`, setado via addInitScript) — cada spec
//      decide se quer o estado autenticado; sem ele, o caminho real de auth é usado (ex.: o
//      cenário não-autenticado → /login continua válido no MESMO dev server).
function e2eAuthRequested(): boolean {
  try {
    return typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ === true;
  } catch {
    return false;
  }
}

// CADEADO do MSW (M16). Duas condições, e nenhuma delas mora num componente:
//   1. `import.meta.env.DEV` — literal `false` em produção, então o Rollup elimina este ramo e
//      nem `src/mocks/**` nem o pacote `msw` entram no bundle do usuário;
//   2. `VITE_SENTINELA_MOCK=on` — a variável ÚNICA do DoD. Ausente ou diferente disso, o app fala
//      com o Gateway real, e nada mais precisa mudar.
//
// O arranque acontece ANTES do render de propósito: um worker que sobe depois da primeira
// requisição deixa passar exatamente a chamada que a tela faz ao montar, e o mock pareceria
// intermitente em vez de desligado.
async function arrancarMockSePedido(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const { mockLigado, iniciarMockDoBrowser } = await import("./mocks/browser");
  if (mockLigado()) await iniciarMockDoBrowser();
}

if (import.meta.env.DEV && import.meta.env.VITE_E2E === "true" && e2eAuthRequested()) {
  import("./e2e/bypass")
    .then(({ installE2EBypass }) => installE2EBypass())
    .finally(renderApp);
} else {
  void arrancarMockSePedido().finally(renderApp);
}
