import React from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import "jsoncrack-react/style.css";
import { LuChevronsRight } from "react-icons/lu";
import { Toolbar } from "./editor/Toolbar";
import { BottomBar } from "./editor/BottomBar";
import { TextEditor } from "./editor/TextEditor";
import { LiveEditor } from "./editor/LiveEditor";
import { FullscreenDropzone } from "./editor/FullscreenDropzone";
import { ModalController } from "./modals/ModalController";
import { Toaster } from "./components/Modal";
import useFile from "./stores/file";
import useConfig from "./stores/config";
import useGraph from "./stores/graph";

export default function App() {
  const checkEditorSession = useFile(state => state.checkEditorSession);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const fullscreen = useGraph(state => state.fullscreen);
  const toggleFullscreen = useGraph(state => state.toggleFullscreen);

  // ?json=<url> bootstrapping + session restore.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    checkEditorSession(params.get("json") ?? undefined);
  }, [checkEditorSession]);

  // Sync the config store with the pre-paint <html data-theme> (index.html
  // resolves it from storage or prefers-color-scheme). Runs once, independent
  // of checkEditorSession's identity.
  React.useLayoutEffect(() => {
    const isDark = document.documentElement.dataset.theme !== "light";
    if (isDark !== useConfig.getState().darkmodeEnabled) {
      useConfig.setState({ darkmodeEnabled: isDark });
    }
  }, []);

  // Warn before leaving with unsaved changes.
  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (useFile.getState().hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeunload);
    return () => window.removeEventListener("beforeunload", beforeunload);
  }, []);

  return (
    <div className="app-root">
      <Toolbar />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", background: "var(--panel-bg)" }}>
        <Allotment proportionalLayout={false}>
          <Allotment.Pane preferredSize={450} minSize={fullscreen ? 0 : 1} maxSize={800} visible={!fullscreen}>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
              <BottomBar />
              <TextEditor />
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={1}>
            <LiveEditor />
          </Allotment.Pane>
        </Allotment>
        {fullscreen && (
          <button
            type="button"
            aria-label="open editor"
            data-tip="Open editor"
            onClick={() => toggleFullscreen(false)}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              translate: "0 -50%",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 120,
              borderRadius: "0 8px 8px 0",
              background: darkmodeEnabled ? "#e8e8e8" : "#1c1c1e",
              color: darkmodeEnabled ? "#1c1c1e" : "#fff",
              cursor: "pointer",
              transition: "background-color 150ms ease, width 150ms ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.width = "32px")}
            onMouseLeave={e => (e.currentTarget.style.width = "28px")}
          >
            <LuChevronsRight size={16} />
          </button>
        )}
        <FullscreenDropzone />
      </div>
      <ModalController />
      <Toaster />
    </div>
  );
}
