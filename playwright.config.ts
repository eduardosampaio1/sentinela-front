// Playwright E2E da jornada canônica (Onda 6 E3, item 21). Sobe o dev server do Vite com a flag
// canônica LIGADA (local, nunca produção) e roda no chromium (headless). O E2E da jornada
// autenticada completa exige um fixture de login controlado (seed de sessão / mock de auth) — ver
// docs/onda6/E2-playwright.md; as mecânicas da jornada já estão provadas nos 30+ testes vitest+MSW.

import { defineConfig, devices } from "@playwright/test";

const PORT = 8080;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED: "true",
      // Base do Gateway = origem do próprio dev server. O MSW browser worker registra os handlers
      // na MESMA origem (sem CORS). VITE_E2E liga o bypass de auth E2E (opt-in por teste).
      VITE_SENTINELA_API_URL: `http://localhost:${PORT}`,
      VITE_E2E: "true",
    },
  },
});
