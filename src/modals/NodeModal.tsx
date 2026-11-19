import React from "react";
import type { NodeData } from "jsoncrack-react";
import { Modal, CodeBlock } from "../components/Modal";
import useFile from "../stores/file";
import useGraph from "../stores/graph";

/** Collapse node rows back to a plain JSON object without nested containers. */
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, unknown> = {};
  nodeRows.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

/** Format the node path as $["key"][0]… */
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const nodeData = useGraph(state => state.selectedNode);
  const format = useFile(state => state.format);

  return (
    <Modal open={open} onClose={onClose} title="Node">
      <section>
        <h3 style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Content</h3>
        <div style={{ maxHeight: 250, maxWidth: 600, overflow: "auto" }}>
          <CodeBlock
            code={normalizeNodeData(nodeData?.text ?? [])}
            lang="json"
            style={{ minWidth: 350, maxWidth: 600 }}
          />
        </div>
      </section>
      <section>
        <h3 style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>JSON Path</h3>
        <div style={{ maxWidth: 600, overflow: "auto" }}>
          <CodeBlock
            code={jsonPathToString(nodeData?.path)}
            lang="json"
            style={{ minWidth: 350, maxHeight: 250 }}
          />
        </div>
      </section>
      <p style={{ fontSize: 12, color: "var(--text-faint)" }}>
        Editing of individual nodes is available in the Pro editor. Current document format:{" "}
        {format.toUpperCase()}.
      </p>
    </Modal>
  );
};
