import React from "react";
import useGraph, { nextDirection } from "../stores/graph";
import useModal from "../stores/modal";
import { isEditableTarget } from "../lib/helpers";

/**
 * Editor-wide keyboard shortcuts.
 *
 * Mounted at the app level (not inside the graph) so export keeps working in
 * the tree view too. Physical `KeyboardEvent.code` is used instead of `key`,
 * because `⇧1` produces layout-dependent characters like "!" / "¡".
 *
 * Shortcuts never fire while a text field or Monaco has focus, except ⌘S:
 * that must still open the export dialog (and always suppresses the browser's
 * own "Save page" prompt).
 */
export const useShortcuts = () => {
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const mod = e.metaKey || e.ctrlKey;
      const editable = isEditableTarget(e.target);

      if (mod && !e.altKey && e.code === "KeyS") {
        e.preventDefault();
        useModal.getState().setVisible("DownloadModal", true);
        return;
      }

      if (editable) return;

      const graph = useGraph.getState();

      if (mod && !e.altKey && (e.code === "Equal" || e.code === "NumpadAdd")) {
        e.preventDefault();
        graph.zoomIn();
      } else if (
        mod &&
        !e.altKey &&
        (e.code === "Minus" || e.code === "NumpadSubtract")
      ) {
        e.preventDefault();
        graph.zoomOut();
      } else if (mod && e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        graph.setDirection(nextDirection(graph.direction));
      } else if (!mod && e.shiftKey && e.code === "Digit1") {
        e.preventDefault();
        graph.focusFirstNode();
      } else if (!mod && e.shiftKey && e.code === "Digit2") {
        e.preventDefault();
        graph.centerView();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
