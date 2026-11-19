import React from "react";
import { VscLinkExternal } from "react-icons/vsc";
import { Modal, toast } from "../components/Modal";
import useFile from "../stores/file";
import useJson from "../stores/json";

export const JQModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [query, setQuery] = React.useState("");
  const getJson = useJson(state => state.getJson);
  const setContents = useFile(state => state.setContents);

  const updateJson = async (query: string, cb?: () => void) => {
    try {
      // jq-web 0.6.2 exports a promise of {json, raw}; its WASM binary is
      // served from /jq.wasm (copied into public/).
      const jqModule = await import("jq-web");
      const jq = await (jqModule as any).default;
      const res = await jq.json(JSON.parse(getJson()), query);
      setContents({ contents: JSON.stringify(res, null, 2) });
      cb?.();
    } catch (error) {
      console.error(error);
      toast.error("Unable to process the request.");
    }
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
          onChange={e => setQuery(e.currentTarget.value)}
          autoFocus={open}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => updateJson(query, onClose)}>
          Display on Graph
        </button>
      </div>
    </Modal>
  );
};
