import React from "react";
import { Modal, CodeBlock } from "../components/Modal";
import { TypeLanguage, typeOptions } from "../enums";
import useJson from "../stores/json";

export const TypeModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const getJson = useJson(state => state.getJson);
  const [type, setType] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<TypeLanguage>(TypeLanguage.TypeScript);

  const editorLanguage = React.useMemo(
    () => typeOptions.find(o => o.value === selectedType)?.lang,
    [selectedType]
  );

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        if (selectedType === TypeLanguage.Go) {
          const jtg = await import("../lib/json2go");
          const gofmt = await import("gofmt.js");
          const types = jtg.default(getJson());
          if (!cancelled) setType(gofmt.default(types.go));
        } else {
          const { run } = await import("json_typegen_wasm");
          const result = run(
            "Root",
            getJson(),
            JSON.stringify({ output_mode: selectedType })
          );
          if (!cancelled) setType(result);
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getJson, open, selectedType]);

  return (
    <Modal open={open} onClose={onClose} title="Generate Types" size="lg">
      <div>
        <label className="field-label" htmlFor="type-lang">Language</label>
        <select
          id="type-lang"
          className="text-input"
          value={selectedType}
          onChange={e => setSelectedType(e.target.value as TypeLanguage)}
        >
          {typeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ maxHeight: 400, overflow: "auto" }}>
        <CodeBlock code={type} lang={editorLanguage === "json" ? "json" : "code"} />
      </div>
    </Modal>
  );
};
