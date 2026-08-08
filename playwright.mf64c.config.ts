// Playwright da MF6.4c — o browser contra o Gateway REAL, não contra o MSW.
//
// Config PRÓPRIA, e não um projeto a mais no `playwright.config.ts`, por uma razão de honestidade
// do harness: a config padrão aponta `VITE_SENTINELA_API_URL` para a própria origem do dev server,
// onde o MSW browser worker responde. As duas configurações não podem coexistir no mesmo dev
// server — e um projeto que herdasse a config padrão rodaria contra o MSW acreditando estar
// contra o Gateway. Esse é exatamente o falso verde que esta fatia existe para não ter.
//
// ## Como rodar
//
//   1. sobe o corredor real (Orchestrator + Gateway + Postgres semeado):
//        cd ../sentinela-facts
//        ORCHESTRATOR_TEST_DATABASE_URL=... python scripts/gate_mf64c_gateway_v2.py --manter-no-ar
//   2. em outro terminal:
//        npx playwright test -c playwright.mf64c.config.ts
//
// O passo 1 escreve `<tmp>/gate-mf64c/corredor.json` com a base do Gateway e os `analysis_id`
// semeados. A porta é sorteada; lê-la do arquivo é o que impede o config de carregar uma segunda
// verdade sobre onde o Gateway está.
//
// ## O MSW continua carregado, e não atrapalha
//
// O bypass E2E do frontend (`src/e2e/bypass.ts`) sobe o worker com handlers ancorados em
// `window.location.origin` — o dev server. As chamadas desta suíte vão para OUTRA origem (a do
// Gateway), não casam com handler nenhum, e `onUnhandledRequest: "bypass"` as deixa ir à rede.
// A prova de que foram à rede não é esse raciocínio: é a asserção da própria spec, que conta as
// respostas vindas da origem do Gateway.

import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ARQUIVO = join(tmpdir(), "gate-mf64c", "corredor.json");

let corredor: { gateway: string; ids: Record<string, string>; workspace: string };
try {
  corredor = JSON.parse(readFileSync(ARQUIVO, "utf-8"));
} catch {
  // Falha na PARTIDA, com a instrução. Sem isto, a suíte subiria, o dev server apontaria para
  // `undefined`, e ~10 casos ficariam vermelhos por um motivo que não é o que eles medem.
  throw new Error(
    `corredor da MF6.4c não está no ar: ${ARQUIVO} não existe.\n` +
      `Suba-o primeiro:\n` +
      `  cd ../sentinela-facts && ORCHESTRATOR_TEST_DATABASE_URL=... \\\n` +
      `    python scripts/gate_mf64c_gateway_v2.py --manter-no-ar`,
  );
}

const PORT = 8081;

export default defineConfig({
  testDir: "./e2e-mf64c",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // Os ids semeados chegam à spec por aqui — ela não os inventa, e não os descobre por
    // varredura: eles vêm de quem os escreveu no Postgres.
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      metadata: corredor,
    },
  ],
  webServer: {
    // Porta PRÓPRIA (8081): o dev server da config padrão pode estar no ar em 8080 com o
    // `VITE_SENTINELA_API_URL` da outra topologia, e `reuseExistingServer` o reaproveitaria —
    // rodando esta suíte contra o MSW sem ninguém perceber.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED: "true",
      // A diferença que faz esta config existir: a base da API é o GATEWAY REAL.
      VITE_SENTINELA_API_URL: corredor.gateway,
      VITE_E2E: "true",
    },
  },
});
