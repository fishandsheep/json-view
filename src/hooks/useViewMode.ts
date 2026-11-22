import React from "react";
import { ViewMode } from "../enums";
import { sessionStore } from "../lib/safeStorage";

const isViewMode = (value: unknown): value is ViewMode =>
  value === ViewMode.Graph || value === ViewMode.Tree;

/**
 * Session-scoped Graph/Tree selection shared by the toolbar and the canvas.
 * `viewmodechange` is a same-tab broadcast; `storage` covers other tabs.
 */
export const useViewMode = () => {
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const stored = sessionStore.get("viewMode");
    return isViewMode(stored) ? stored : ViewMode.Graph;
  });

  React.useEffect(() => {
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

  const changeViewMode = React.useCallback((value: ViewMode) => {
    setViewMode(value);
    sessionStore.set("viewMode", value);
    window.dispatchEvent(new CustomEvent("viewmodechange"));
  }, []);

  return { viewMode, changeViewMode };
};
