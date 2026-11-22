/** Type declarations for untyped dependencies (jq-web, gofmt.js) and the
 * vendored json2go converter from the upstream project. */

/** `edcore.main` (editor without bundled languages) has no .d.ts; its runtime
 * surface is asserted through the `monaco-editor` types in monacoSetup.ts. */
declare module "monaco-editor/esm/vs/editor/edcore.main.js";

declare module "jq-web" {
  /** jq-web 0.6.2 module.exports is a promise resolving to {json, raw}. */
  const jq: Promise<{
    json: (input: unknown, filter: string) => Promise<unknown>;
    raw: (input: string, filter: string) => Promise<string>;
  }>;
  export default jq;
}

declare module "gofmt.js" {
  const gofmt: (code: string) => string;
  export default gofmt;
}

declare module "../lib/json2go.js" {
  const json2go: (json: string) => { go: string };
  export default json2go;
}
