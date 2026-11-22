import React from "react";
import { VscFiles } from "react-icons/vsc";
import { toast } from "../components/Modal";
import useFile from "../stores/file";
import { FileFormat } from "../enums";
import { MAX_IMPORT_SIZE } from "../lib/helpers";

const ACCEPTED: Record<string, FileFormat> = {
  json: FileFormat.JSON,
  yaml: FileFormat.YAML,
  yml: FileFormat.YAML,
  xml: FileFormat.XML,
  csv: FileFormat.CSV,
};

/**
 * Whole-window file drop target implemented with the native Drag and Drop API
 * (no dropzone library). An overlay is announced while a drag is in progress.
 */
export const FullscreenDropzone: React.FC = () => {
  const setContents = useFile(state => state.setContents);
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);

  React.useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault(); // required to allow dropping
    };
    const onDragLeave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      await importFile(file, setContents);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [setContents]);

  if (!dragging) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "color-mix(in oklch, var(--accent) 12%, var(--canvas-bg))",
        border: "2px dashed var(--accent)",
        pointerEvents: "none",
      }}
      aria-live="polite"
    >
      <VscFiles size={100} />
      <div style={{ fontSize: 24, fontWeight: 500 }}>Upload to JSON Crack</div>
      <div style={{ fontSize: 16, color: "var(--text-muted)" }}>(Max file size: 300 KB)</div>
    </div>
  );
};

export async function importFile(
  file: File,
  setContents: ReturnType<typeof useFile.getState>["setContents"]
): Promise<boolean> {
  try {
    if (file.size > MAX_IMPORT_SIZE) {
      toast.error(`File too large (max ${MAX_IMPORT_SIZE / 1024} KB): ${file.name}`);
      return false;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    const format = (ext && ACCEPTED[ext]) || FileFormat.JSON;
    const text = await file.text();
    await setContents({ contents: text, format, hasChanges: false });
    return true;
  } catch (err) {
    toast.error("An error occurred while reading the file.");
    console.error(err);
    return false;
  }
}
