import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Baseline quarantine (Onda 6 E1): 4 suítes legadas/dead-stack pré-existentes, fora da E1.
// Fonte única + gate: src/test/quarantine.ts + src/test/v1/quarantine-gate.test.ts.
import { QUARANTINE_FILES } from "./src/test/quarantine";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [...configDefaults.exclude, ...QUARANTINE_FILES],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
