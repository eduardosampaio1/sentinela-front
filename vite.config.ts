import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  plugins: [react()],

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
