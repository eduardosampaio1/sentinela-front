import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { rm } from "node:fs/promises";
import path from "path";

/**
 * O ARQUIVO DO SERVICE WORKER DO MSW NÃO VAI PARA PRODUÇÃO.
 *
 * O código do mock já não entra no bundle: `main.tsx` importa `mocks/browser` sob
 * `import.meta.env.DEV`, que é o literal `false` no build, e o Rollup elimina o ramo. Isso foi
 * medido pelo sourcemap dos 438 módulos empacotados — nem `msw`, nem `setupWorker`, nem handler
 * nenhum sobrevive.
 *
 * Mas `mockServiceWorker.js` mora em `public/`, e `public/` é copiado VERBATIM. O arquivo ia
 * junto: inerte, porque nada o registra, e mesmo assim servido na raiz do site.
 *
 * "Inerte" não é argumento suficiente para um produto que audita procedência. O arquivo anuncia
 * a infraestrutura de mock a quem olhar, e um service worker servido na origem é registrável por
 * qualquer página da mesma origem — risco estreito, e existente.
 *
 * Ele fica em `public/` porque o dev precisa dele na raiz (o `worker.start()` procura em
 * `/mockServiceWorker.js`), e sai no fim do build. `apply: "build"` garante que o dev nunca perde
 * o arquivo. O gate `scripts/gate-bundle-sem-mock.mjs` reprova se ele voltar.
 */
function semMockNoBuild(): Plugin {
  return {
    name: "sentinela:sem-mock-no-build",
    apply: "build",
    async closeBundle() {
      await rm(path.resolve(__dirname, "dist/mockServiceWorker.js"), { force: true });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  plugins: [react(), semMockNoBuild()],

  server: {
    host: "::",
    port: Number(process.env.PORT) || 8080,
    hmr: {
      overlay: false,
    },
    // Prevent proxy timeouts on large dep bundles (lucide-react, supabase-js)
    headers: {
      "Cache-Control": "no-transform",
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
    ],
  },
}));
