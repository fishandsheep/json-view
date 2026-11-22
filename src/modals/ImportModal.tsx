import React from "react";
import { AiOutlineUpload } from "react-icons/ai";
import { Modal, toast } from "../components/Modal";
import useFile from "../stores/file";
import { importFile } from "../editor/FullscreenDropzone";
import { FileFormat } from "../enums";
import { fetchJsonDocument } from "../lib/helpers";

export const ImportModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [url, setURL] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const setContents = useFile(state => state.setContents);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setURL("");
  };

  const handleImportFile = async () => {
    if (url) {
      setFile(null);
      const loadingToast = toast.loading("Loading...");
      try {
        const parsed = await fetchJsonDocument(url);
        await setContents({
          contents: JSON.stringify(parsed, null, 2),
          format: FileFormat.JSON,
        });
        reset();
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch JSON!"
        );
      } finally {
        toast.dismiss(loadingToast);
      }
    } else if (file) {
      const ok = await importFile(file, setContents);
      if (!ok) return;
      reset();
      onClose();
    }
  };

  const [dropActive, setDropActive] = React.useState(false);

  return (
    <Modal open={open} onClose={() => (reset(), onClose())} title="Import File">
      <input
        type="url"
        className="text-input"
        placeholder="URL of JSON to fetch"
        value={url}
        onChange={e => setURL(e.target.value)}
        autoFocus={open}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop here or click to upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={async e => {
          e.preventDefault();
          setDropActive(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          minHeight: 220,
          cursor: "pointer",
          borderRadius: 10,
          border: `2px dashed ${dropActive ? "var(--accent)" : "var(--border-strong)"}`,
          background: dropActive ? "var(--hover-bg)" : "transparent",
          transition: "border-color 120ms ease, background 120ms ease",
        }}
      >
        <AiOutlineUpload size={48} opacity={0.7} />
        <strong>Drop here or click to upload files</strong>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{file?.name ?? "None"}</span>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".json,.yaml,.yml,.xml,.csv,application/json"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={handleImportFile} disabled={!(file || url)}>
          Import
        </button>
      </div>
    </Modal>
  );
};
