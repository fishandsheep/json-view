/**
 * Monaco bootstrap, kept in one lazily-loaded module.
 *
 * `edcore.main` is the full editor + all editor contributions (find, folding,
 * context menu, …) *without* the bundled languages. Compared to the default
 * `monaco-editor` entry (editor.main) this drops every language service
 * (TypeScript/CSS/HTML) and ~80 basic languages the editor never uses; only
 * JSON (validation + schema) and XML (highlighting) are registered.
 *
 * Monaco is bundled locally as ESM instead of fetched from a CDN: no runtime
 * dependency on unpkg, and no global `define` that breaks UMD libraries like
 * human-format (used by jsoncrack-react).
 */
import { loader } from "@monaco-editor/react";
import * as monacoRuntime from "monaco-editor/esm/vs/editor/edcore.main.js";
import type * as MonacoNamespace from "monaco-editor";
import * as jsonContribution from "monaco-editor/esm/vs/language/json/monaco.contribution.js";
import "monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

/** `edcore.main` is the same runtime API as `monaco-editor` (which has the
 * typings) without the bundled language contributions. */
const monaco = monacoRuntime as unknown as typeof MonacoNamespace;

// editor.main normally attaches the language-service module to
// `languages.json`; edcore.main does not, so do it here (TextEditor's schema
// diagnostics rely on `monaco.languages.json.jsonDefaults`).
(monaco.languages as unknown as { json?: unknown }).json = jsonContribution;

// CSV has no bundled contribution; a tiny Monarch tokenizer gives quoted
// cells, numbers and delimiters distinct colors without another dependency.
monaco.languages.register({ id: "csv" });
monaco.languages.setMonarchTokensProvider("csv", {
  tokenizer: {
    root: [
      [/"(?:[^"]|"")*"/, "string"],
      [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
      [/,/, "delimiter"],
      [/[^,\r\n]+/, "identifier"],
    ],
  },
});

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === "json" ? new jsonWorker() : new editorWorker();
  },
};

loader.config({ monaco });

export { monaco };
