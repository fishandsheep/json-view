import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "../lib/safeStorage";

const STORAGE_KEY = "jsoncrack-config";

interface ConfigStates {
  darkmodeEnabled: boolean;
  liveTransformEnabled: boolean;
  gesturesEnabled: boolean;
  rulersEnabled: boolean;
}

interface ConfigActions {
  toggleDarkMode: (value: boolean) => void;
  toggleLiveTransform: (value: boolean) => void;
  toggleGestures: (value: boolean) => void;
  toggleRulers: (value: boolean) => void;
}

const initialStates: ConfigStates = {
  darkmodeEnabled: true,
  liveTransformEnabled: true,
  gesturesEnabled: false,
  rulersEnabled: true,
};

/** Single source of truth for the editor look & feel. Persisted to
 * `jsoncrack-config` via the safe storage adapter; index.html reads the same
 * entry before paint so there is no flash of the wrong theme. The current
 * value is also mirrored onto `<html data-theme>` for CSS `light-dark()`
 * tokens and Monaco. */
const useConfig = create<ConfigStates & ConfigActions>()(
  persist(
    (set) => ({
      ...initialStates,
      toggleDarkMode: darkmodeEnabled => {
        set({ darkmodeEnabled });
        const html = document.documentElement;
        html.dataset.theme = darkmodeEnabled ? "dark" : "light";
        window.dispatchEvent(new Event("themechange"));
      },
      toggleLiveTransform: liveTransformEnabled => set({ liveTransformEnabled }),
      toggleGestures: gesturesEnabled => set({ gesturesEnabled }),
      toggleRulers: rulersEnabled => set({ rulersEnabled }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

export default useConfig;
