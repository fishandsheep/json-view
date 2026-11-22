import React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { monaco } from "./monacoSetup";
import useConfig from "../stores/config";
import useFile from "../stores/file";

/** Dedicated model path so the applied JSON Schema only validates this
 * document — schema/tool editors use their own default models. */
const DOCUMENT_PATH = "file:///jsoncrack-document.json";
const DOCUMENT_FILE_NAME = "jsoncrack-document.json";
const SCHEMA_URI = "https://jsoncrack.local/document.schema.json";

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

  // Apply the schema produced by Tools → JSON Schema to the JSON language
  // service, so failures show up as Monaco markers and in the bottom bar.
  React.useEffect(() => {
    // `languages.json` is flagged deprecated in the 0.55 typings, but the
    // runtime diagnostics API still ships with the bundled JSON worker.
    const jsonDefaults = (monaco.languages.json as unknown as {
      jsonDefaults?: { setDiagnosticsOptions: (options: unknown) => void };
    }).jsonDefaults;
    if (!jsonDefaults) return;
    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      // The document parser (jsonc-parser) accepts both of these.
      allowComments: true,
      trailingCommas: "ignore",
      schemas: jsonSchema
        ? [
            {
              uri: SCHEMA_URI,
              fileMatch: [DOCUMENT_FILE_NAME],
              schema: jsonSchema,
            },
          ]
        : [],
    });
  }, [jsonSchema]);

  return (
    <div style={{ display: "grid", height: "100%", gridTemplateRows: "minmax(0, 1fr)" }}>
      <Editor
        height="100%"
        path={DOCUMENT_PATH}
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
