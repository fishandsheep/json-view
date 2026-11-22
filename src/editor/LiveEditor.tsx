import React from "react";
import { ViewMode } from "../enums";
import { useViewMode } from "../hooks/useViewMode";

const GraphView = React.lazy(() =>
  import("./GraphView").then(m => ({ default: m.GraphView }))
);
const TreeView = React.lazy(() =>
  import("./TreeView").then(m => ({ default: m.TreeView }))
);

export const LiveEditor: React.FC = () => {
  const { viewMode } = useViewMode();

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--canvas-bg)",
        overflow: "auto",
      }}
      onContextMenuCapture={e => e.preventDefault()}
    >
      <React.Suspense
        fallback={
          <div
            style={{
              display: "grid",
              placeItems: "center",
              height: "100%",
              color: "var(--text-faint)",
              fontSize: 13,
            }}
          >
            Rendering graph…
          </div>
        }
      >
        {viewMode === ViewMode.Graph ? <GraphView /> : <TreeView />}
      </React.Suspense>
    </div>
  );
};
