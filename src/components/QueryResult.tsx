import React from "react";
import { CodeBlock } from "./Modal";

/**
 * Query output preview. Running a jq/JSONPath query must not overwrite the
 * document implicitly; the user explicitly replaces it from here.
 */
export const QueryResult: React.FC<{ value: unknown; onApply: () => void }> = ({
  value,
  onApply,
}) => {
  const text = React.useMemo(() => {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? "null" : json;
  }, [value]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="field-label">Result</div>
      <div style={{ maxHeight: 320, overflow: "auto" }}>
        <CodeBlock code={text} lang="json" style={{ minWidth: 0 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" onClick={onApply}>
          Replace document
        </button>
      </div>
    </section>
  );
};
