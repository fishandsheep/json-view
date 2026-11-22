import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

// json_typegen_wasm ships raw ESM + WASM; keep it out of pre-bundling and let
// vite-plugin-wasm handle it. jq-web must stay IN pre-bundling so esbuild can
// convert its CommonJS export to ESM.
// Project sites are served from https://<owner>.github.io/<repo>/; GitHub
// Actions sets GITHUB_ACTIONS, so local dev keeps `/` while the Pages build
// gets the repository base path. A `<owner>.github.io` repo stays at `/`.
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.GITHUB_ACTIONS && repository && !repository.endsWith(".github.io")
    ? `/${repository}/`
    : "/";

export default defineConfig({
  base,
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
