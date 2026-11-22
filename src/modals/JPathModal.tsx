import React from "react";
import { VscLinkExternal } from "react-icons/vsc";
import { JSONPath } from "jsonpath-plus";
import { Modal, toast } from "../components/Modal";
import { QueryResult } from "../components/QueryResult";
import useFile from "../stores/file";
import useJson from "../stores/json";

export const JPathModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const getParsed = useJson(state => state.getParsed);
  const setContents = useFile(state => state.setContents);
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<{ value: unknown } | null>(null);

  const evaluateJsonPath = () => {
    try {
      const value = JSONPath({ path: query, json: getParsed() as object });
      setResult({ value });
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };

  const applyResult = async () => {
    if (!result) return;
    const text = JSON.stringify(result.value, null, 2) ?? "null";
    await setContents({ contents: text });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="JSON Path" size="lg">
      <p className="dimmed-text">
        JsonPath expressions always refer to a JSON structure in the same way as XPath expression
        are used in combination with an XML document. The &quot;root member object&quot; in JsonPath
        is always referred to as $ regardless if it is an object or array.
        <br />
        <a
          className="link"
          target="_blank"
          href="https://docs.oracle.com/cd/E60058_01/PDF/8.0.8.x/8.0.8.0.0/PMF_HTML/JsonPath_Expressions.htm"
          rel="noopener noreferrer"
        >
          Read documentation. <VscLinkExternal />
        </a>
      </p>
      <input
        type="text"
        className="text-input"
        placeholder="Enter JSON Path..."
        value={query}
        onChange={e => {
          setQuery(e.currentTarget.value);
          setResult(null);
        }}
        onKeyDown={e => e.key === "Enter" && query.length > 0 && evaluateJsonPath()}
        autoFocus={open}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={evaluateJsonPath} disabled={!query.length}>
          Run query
        </button>
      </div>
      {result && <QueryResult value={result.value} onApply={() => void applyResult()} />}
    </Modal>
  );
};
