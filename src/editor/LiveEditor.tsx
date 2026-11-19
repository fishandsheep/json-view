import React from "react";
import { ViewMode } from "../enums";
import { sessionStore } from "../lib/safeStorage";

const GraphView = React.lazy(() =>
  import("./GraphView").then(m => ({ default: m.GraphView }))
);
const TreeView = React.lazy(() =>
  import("./TreeView").then(m => ({ default: m.TreeView }))
);

const isViewMode = (v: unknown): v is ViewMode =>
  v === ViewMode.Graph || v === ViewMode.Tree;

export const LiveEditor: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const stored = sessionStore.get("viewMode");
    return stored === ViewMode.Tree ? ViewMode.Tree : ViewMode.Graph;
  });

  React.useEffect(() => {
    // `viewmodechange` is dispatched by the toolbar in this tab; `storage`
    // fires when another tab switches the (session-scoped) view mode.
    const sync = () => {
      const stored = sessionStore.get("viewMode");
      if (isViewMode(stored)) setViewMode(stored);
    };
    window.addEventListener("viewmodechange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("viewmodechange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
