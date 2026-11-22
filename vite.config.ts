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
  // The parse worker dynamically imports the format parsers, which requires a
  // code-splitting-capable (ES module) worker format.
  worker: {
    format: "es",
  },
  build: {
    target: "es2022",
    // No manualChunks: forcing jsoncrack-react into its own chunk made Rollup
    // hoist the React runtime there, and the entry then statically imported
    // that chunk — pulling the whole graph engine into first paint despite the
    // React.lazy boundary. Natural splitting keeps all of it in lazy chunks.
  },
});
