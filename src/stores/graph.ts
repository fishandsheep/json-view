import type { RefObject } from "react";
import { create } from "zustand";
import type { JSONCrackRef, LayoutDirection, NodeData } from "jsoncrack-react";
import type { ViewPort } from "react-zoomable-ui";

interface GraphStates {
  viewPort: ViewPort | null;
  jsonCrackRef: RefObject<JSONCrackRef | null> | null;
  direction: LayoutDirection;
  fullscreen: boolean;
  selectedNode: NodeData | null;
  collapsedCount: number;
  /** Mounted graph canvas, used by the image exporter (set by GraphView). */
  exportElement: HTMLElement | null;
}

interface GraphActions {
  setDirection: (direction: LayoutDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setJsonCrackRef: (ref: RefObject<JSONCrackRef | null>) => void;
  setSelectedNode: (nodeData: NodeData | null) => void;
  focusFirstNode: () => void;
  toggleFullscreen: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  setCollapsedCount: (count: number) => void;
  setExportElement: (element: HTMLElement | null) => void;
}

export const nextDirection = (direction: LayoutDirection): LayoutDirection => {
  if (direction === "RIGHT") return "DOWN";
  if (direction === "DOWN") return "LEFT";
  if (direction === "LEFT") return "UP";
  return "RIGHT";
};

const useGraph = create<GraphStates & GraphActions>()((set, get) => ({
  viewPort: null,
  jsonCrackRef: null,
  direction: "RIGHT",
  fullscreen: false,
  selectedNode: null,
  collapsedCount: 0,
  exportElement: null,
  setSelectedNode: nodeData => set({ selectedNode: nodeData }),
  setDirection: (direction = "RIGHT") => {
    // GraphView remounts on a direction change and jsoncrack-react's
    // `centerOnLayout` re-centers after the ELK pass, so no timer is needed.
    set({ direction });
  },
  focusFirstNode: () => get().jsonCrackRef?.current?.focusFirstNode(),
  zoomIn: () => get().jsonCrackRef?.current?.zoomIn(),
  zoomOut: () => get().jsonCrackRef?.current?.zoomOut(),
  centerView: () => get().jsonCrackRef?.current?.centerView(),
  expandAll: () => get().jsonCrackRef?.current?.expandAll(),
  collapseAll: () => get().jsonCrackRef?.current?.collapseAll(),
  setCollapsedCount: count => {
    if (get().collapsedCount === count) return;
    set({ collapsedCount: count });
  },
  setExportElement: exportElement => set({ exportElement }),
  toggleFullscreen: fullscreen => set({ fullscreen }),
  setViewPort: viewPort => set({ viewPort }),
  setJsonCrackRef: jsonCrackRef => set({ jsonCrackRef }),
}));

export default useGraph;
