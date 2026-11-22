import React from "react";
import { VscLinkExternal } from "react-icons/vsc";
import { Modal, toast } from "../components/Modal";
import { QueryResult } from "../components/QueryResult";
import useFile from "../stores/file";
import useJson from "../stores/json";

export const JQModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<{ value: unknown } | null>(null);
  const [running, setRunning] = React.useState(false);
  const getParsed = useJson(state => state.getParsed);
  const setContents = useFile(state => state.setContents);

  const runQuery = async () => {
    if (!query.trim()) return;
    setRunning(true);
    try {
      // jq-web 0.6.2 exports a promise of {json, raw}; its WASM binary is
      // served from /jq.wasm (copied into public/).
      const jqModule = await import("jq-web");
      const jq = await (jqModule as any).default;
      const value = await jq.json(getParsed(), query);
      setResult({ value });
    } catch (error) {
      console.error(error);
      toast.error("Unable to process the request.");
    } finally {
      setRunning(false);
    }
  };

  const applyResult = async () => {
    if (!result) return;
    const text = JSON.stringify(result.value, null, 2) ?? "null";
    await setContents({ contents: text });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="JSON Query" size="lg">
      <p className="dimmed-text">
        jq is a lightweight and flexible command-line JSON processor. JSON Crack uses simplified
        version of jq, not all features are supported.
        <br />
        <a
          className="link"
          target="_blank"
          href="https://jqlang.github.io/jq/manual/"
          rel="noopener noreferrer"
        >
          Read documentation. <VscLinkExternal />
        </a>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0 10px",
            fontSize: 13,
            color: "var(--text-muted)",
            background: "var(--hover-bg)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          jq
        </span>
        <input
          type="text"
          className="text-input"
          placeholder="Enter jq query"
          value={query}
          onChange={e => {
            setQuery(e.currentTarget.value);
            setResult(null);
          }}
          onKeyDown={e => e.key === "Enter" && void runQuery()}
          autoFocus={open}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => void runQuery()} disabled={running}>
          {running ? "Running…" : "Run query"}
        </button>
      </div>
      {result && <QueryResult value={result.value} onApply={() => void applyResult()} />}
    </Modal>
  );
};
