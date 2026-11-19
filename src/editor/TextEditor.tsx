import React from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import useConfig from "../stores/config";
import useFile from "../stores/file";

// Bundle Monaco locally as an ES module instead of fetching the AMD loader
// from a CDN: no runtime dependency on unpkg, and no global `define` that
// breaks UMD libraries like human-format (used by jsoncrack-react).
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });

const editorOptions = {
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
  placeholder: "Start typing...",
  fontFamily:
    "ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
  automaticLayout: true,
};

export const TextEditor: React.FC = () => {
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const setError = useFile(state => state.setError);
  const jsonSchema = useFile(state => state.jsonSchema);
  const fileType = useFile(state => state.format);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);

  const handleMount: OnMount = React.useCallback(editor => {
    editor.onDidPaste(e => {
      // Auto-format keeps pasted JSON readable, but formatting a very large
      // document blocks the main thread for seconds — skip it for big pastes.
      const model = editor.getModel();
      if (!model) return;
      const pasted = model.getValueInRange(e.range);
      if (pasted.length > 20_000 || model.getValueLength() > 200_000) return;
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  return (
    <div style={{ display: "grid", height: "100%", gridTemplateRows: "minmax(0, 1fr)" }}>
      <Editor
        height="100%"
        language={fileType}
        theme={darkmodeEnabled ? "vs-dark" : "light"}
        value={contents}
        options={editorOptions}
        onMount={handleMount}
        onValidate={errors => setError(errors[0]?.message || null)}
        onChange={value => setContents({ contents: value ?? "", skipUpdate: true })}
        loading={
          <div style={{ background: "var(--panel-bg)", height: "100%", width: "100%" }} />
        }
      />
    </div>
  );
};
