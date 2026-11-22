import React from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import "jsoncrack-react/style.css";
import { Toolbar } from "./editor/Toolbar";
import { BottomBar } from "./editor/BottomBar";
import { LiveEditor } from "./editor/LiveEditor";
import { FullscreenDropzone } from "./editor/FullscreenDropzone";
import { Toaster, toast } from "./components/Modal";
import { useShortcuts } from "./hooks/useShortcuts";
import useFile from "./stores/file";
import useConfig from "./stores/config";
import useGraph from "./stores/graph";

// Monaco and the dialog suite (html-to-image, WASM tools) are not needed for
// first paint; keep them out of the entry chunk.
const TextEditor = React.lazy(() =>
  import("./editor/TextEditor").then(m => ({ default: m.TextEditor }))
);
const ModalController = React.lazy(() =>
  import("./modals/ModalController").then(m => ({ default: m.ModalController }))
);

/** URL bootstrapping must happen once, even under React StrictMode's
 * mount → unmount → mount cycle (the second mount would restore the session
 * and overwrite the fetched document). */
let bootstrapped = false;

export default function App() {
  const checkEditorSession = useFile(state => state.checkEditorSession);
  const fullscreen = useGraph(state => state.fullscreen);

  useShortcuts();

  // ?json=<url> bootstrapping + session restore.
  React.useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;

    const params = new URLSearchParams(window.location.search);
    const jsonUrl = params.get("json");
    if (jsonUrl) {
      // `?json=` is a one-shot import: drop it so later edits can be
      // persisted again for this session.
      params.delete("json");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      );
    }

    Promise.resolve(checkEditorSession(jsonUrl ?? undefined)).catch(error => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load the document from the URL."
      );
    });
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

  // Persist the last keystrokes before the tab goes away (the session save
  // itself is debounced to keep typing off the synchronous storage path).
  React.useEffect(() => {
    const flush = () => useFile.getState().flushSession();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  return (
    <div className="app-root">
      <Toolbar />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", background: "var(--panel-bg)" }}>
        <Allotment proportionalLayout={false}>
          <Allotment.Pane preferredSize={450} minSize={fullscreen ? 0 : 1} maxSize={800} visible={!fullscreen}>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
              <BottomBar />
              <React.Suspense
                fallback={
                  <div
                    aria-hidden
                    style={{ flex: 1, minHeight: 0, background: "var(--panel-bg)" }}
                  />
                }
              >
                <TextEditor />
              </React.Suspense>
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={1}>
            <LiveEditor />
          </Allotment.Pane>
        </Allotment>
        <FullscreenDropzone />
      </div>
      <React.Suspense fallback={null}>
        <ModalController />
      </React.Suspense>
      <Toaster />
    </div>
  );
}
