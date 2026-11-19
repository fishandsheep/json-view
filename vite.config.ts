import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

// json_typegen_wasm ships raw ESM + WASM; keep it out of pre-bundling and let
// vite-plugin-wasm handle it. jq-web must stay IN pre-bundling so esbuild can
// convert its CommonJS export to ESM.
export default defineConfig({
  plugins: [react(), wasm()],
  optimizeDeps: {
    exclude: ["json_typegen_wasm"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["monaco-editor", "@monaco-editor/react"],
          graph: ["jsoncrack-react"],
        },
      },
    },
  },
});
