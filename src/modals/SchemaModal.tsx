import React from "react";
import Editor from "@monaco-editor/react";
import "../editor/monacoSetup";
import { VscLinkExternal } from "react-icons/vsc";
import { Modal, toast } from "../components/Modal";
import useConfig from "../stores/config";
import useFile from "../stores/file";

const sampleSchema = JSON.stringify(
  {
    $schema: "http://json-schema.org/draft-04/schema#",
    title: "Product",
    description: "A product from the catalog",
    type: "object",
    properties: {
      id: { description: "The unique identifier for a product", type: "integer" },
      name: { description: "Name of the product", type: "string" },
    },
    required: ["id", "name"],
  },
  null,
  2
);

export const SchemaModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const setJsonSchema = useFile(state => state.setJsonSchema);
  const appliedSchema = useFile(state => state.jsonSchema);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const [schema, setSchema] = React.useState("");

  React.useEffect(() => {
    if (open && !schema) {
      setSchema(appliedSchema ? JSON.stringify(appliedSchema, null, 2) : sampleSchema);
    }
  }, [open, appliedSchema, schema]);

  const onApply = () => {
    try {
      const parsedSchema = JSON.parse(schema);
      setJsonSchema(parsedSchema);
      toast.success("Applied schema!");
      onClose();
    } catch {
      toast.error("Invalid Schema");
    }
  };

  const onClear = () => {
    setJsonSchema(null);
    setSchema("");
    toast.message("Disabled JSON Schema");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="JSON Schema" size="lg">
      <p className="dimmed-text">Any validation failures are shown at the bottom toolbar of pane.</p>
      <a
        className="link"
        target="_blank"
        href="https://niem.github.io/json/sample-schema/"
        rel="noopener noreferrer"
      >
        View Examples <VscLinkExternal />
      </a>
      <div
        style={{
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <Editor
          height={300}
          value={schema}
          theme={darkmodeEnabled ? "vs-dark" : "light"}
          onChange={value => setSchema(value ?? "")}
          language="json"
          options={{
            formatOnPaste: true,
            tabSize: 2,
            formatOnType: true,
            scrollBeyondLastLine: false,
            stickyScroll: { enabled: false },
            minimap: { enabled: false },
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn secondary" onClick={onClear} disabled={!schema}>
          Clear
        </button>
        <button type="button" className="btn" onClick={onApply} disabled={!schema}>
          Apply
        </button>
      </div>
    </Modal>
  );
};
