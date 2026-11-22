import React from "react";
import { JSONCrack, type JSONCrackRef, type GraphData, type NodeData } from "jsoncrack-react";
import useConfig from "../stores/config";
import useJson from "../stores/json";
import useModal from "../stores/modal";
import useGraph from "../stores/graph";
import { toast } from "../components/Modal";
import { GraphToolbar } from "./GraphToolbar";
import { NotSupported, SecureInfo } from "./GraphExtras";

/** Hard cap from the canvas package; above this the limit overlay shows. */
const SUPPORTED_LIMIT = 1500;
/**
 * Graphs larger than this are auto-collapsed on load. ELK layout + DOM
 * mounting cost grows super-linearly with visible node count (a 1300-node
 * graph takes ~15s and ~80k DOM elements fully expanded), while a collapsed
 * render is instant and can be expanded branch by branch.
 */
const PERF_COLLAPSE_THRESHOLD = 250;

/**
 * All container-row paths of the graph: collapsing them hides every node
 * below the first two levels while keeping each level expandable through its
 * "+" control, so huge graphs drill down like a file tree instead of laying
 * out thousands of nodes at once.
 * (The package's own `collapseAll` cannot be used here: for an array root it
 * collapses the only expandable level and leaves a dead "[N items]" pill.)
 */
const allCollapsePaths = (graph: GraphData): Array<(string | number)[]> => {
  const paths: Array<(string | number)[]> = [];
  for (const node of graph.nodes) {
    const p = node.path;
    if (!p) continue;
    for (const row of node.text) {
      if (
        row.key != null &&
        (row.type === "object" || row.type === "array") &&
        (row.childrenCount ?? 0) > 0
      ) {
        paths.push([...p, row.key]);
      }
    }
  }
  return paths;
};

export const GraphView: React.FC = () => {
  const setViewPort = useGraph(state => state.setViewPort);
  const setJsonCrackRef = useGraph(state => state.setJsonCrackRef);
  const direction = useGraph(state => state.direction);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const setCollapsedCount = useGraph(state => state.setCollapsedCount);
  const setExportElement = useGraph(state => state.setExportElement);
  const gesturesEnabled = useConfig(state => state.gesturesEnabled);
  const rulersEnabled = useConfig(state => state.rulersEnabled);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const parsed = useJson(state => state.parsed);
  const setVisible = useModal(state => state.setVisible);
  const jsonCrackRef = React.useRef<JSONCrackRef>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [heavyGraph, setHeavyGraph] = React.useState(false);

  React.useEffect(() => {
    setJsonCrackRef(jsonCrackRef);
  }, [setJsonCrackRef]);

  // The image exporter captures this element; publish it instead of letting
  // DownloadModal query the DOM for library-specific class names.
  React.useEffect(() => {
    setExportElement(canvasRef.current);
    return () => setExportElement(null);
  }, [setExportElement]);

  const handleParse = React.useCallback(
    (graph: GraphData) => {
      const count = graph.nodes.length;
      setHeavyGraph(count > PERF_COLLAPSE_THRESHOLD);

      // Collapse oversized graphs once, before the first layout pass, so the
      // initial render only shows the first two levels. Skipped when the user
      // already has branches collapsed (or expanded) on their own.
      if (count > PERF_COLLAPSE_THRESHOLD && useGraph.getState().collapsedCount === 0) {
        const paths = allCollapsePaths(graph);
        for (const path of paths) jsonCrackRef.current?.toggleCollapse(path);
        if (paths.length > 0) {
          toast.message(
            `Large graph (${count} nodes) collapsed for performance — expand branches with the + controls.`
          );
        }
      }
    },
    []
  );

  const handleCollapseChange = React.useCallback(
    (paths: string[]) => setCollapsedCount(paths.length),
    [setCollapsedCount]
  );

  const handleNodeClick = React.useCallback(
    (node: NodeData) => {
      setSelectedNode(node);
      setVisible("NodeModal", true);
    },
    [setSelectedNode, setVisible]
  );

  // Per-rect drop-shadows are a heavy paint cost at scale; only keep them for
  // small graphs (the collapsed view of a large graph is also flat).
  const canvasCss = React.useMemo(() => {
    const shadow = heavyGraph
      ? "none"
      : `drop-shadow(2px 2px 0 ${darkmodeEnabled ? "rgba(0,0,0,.6)" : "rgba(15,23,42,.25)"})`;
    return `
      .jsoncrack-space { cursor: url("${import.meta.env.BASE_URL}cursor.svg"), auto; }
      .jsoncrack-space:active { cursor: grabbing; }
      .jsoncrack-space rect { rx: 5; ry: 5; stroke-width: 1; filter: ${shadow}; }
      .jsoncrack-space path { stroke-linecap: round; stroke-linejoin: round; }
    `;
  }, [darkmodeEnabled, heavyGraph]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <SecureInfo />
      <GraphToolbar />
      <style>{canvasCss}</style>
      <div
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
        onContextMenu={e => e.preventDefault()}
        onClick={() => document.activeElement instanceof HTMLElement && document.activeElement.blur()}
      >
        <JSONCrack
          ref={jsonCrackRef}
          // jsoncrack-react can't update two props in place: reaflow's ELK
          // layout only re-runs when nodes/edges change (so `direction` needs a
          // remount), and react-zoomable-ui captures `trackpadZoom` when its
          // viewport is created (so `gesturesEnabled` does too). `rulersEnabled`
          // is a plain className input, so it must stay out of the key — keeping
          // it in used to drop zoom and collapse state for a cosmetic toggle.
          key={[direction, gesturesEnabled].join("-")}
          json={parsed as object}
          theme={darkmodeEnabled ? "dark" : "light"}
          layoutDirection={direction}
          showControls={false}
          showGrid={rulersEnabled}
          trackpadZoom={gesturesEnabled}
          maxRenderableNodes={SUPPORTED_LIMIT}
          centerOnLayout
          onViewportCreate={setViewPort}
          onNodeClick={handleNodeClick}
          onParse={handleParse}
          onCollapseChange={handleCollapseChange}
          renderNodeLimitExceeded={() => <NotSupported />}
        />
      </div>
    </div>
  );
};
