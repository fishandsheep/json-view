import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localStore } from "../lib/safeStorage";

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

/** Single source of truth for the editor look & feel. The `darkmodeEnabled`
 * flag is mirrored onto `<html data-theme>` so CSS `light-dark()` tokens and
 * Monaco themes pick it up without a React re-render. */
const useConfig = create<ConfigStates & ConfigActions>()(
  persist(
    (set, get) => ({
      ...initialStates,
      toggleDarkMode: darkmodeEnabled => {
        set({ darkmodeEnabled });
        const html = document.documentElement;
        html.dataset.theme = darkmodeEnabled ? "dark" : "light";
        localStore.set("jsoncrack-theme", darkmodeEnabled ? "dark" : "light");
        window.dispatchEvent(new Event("themechange"));
      },
      toggleLiveTransform: liveTransformEnabled => set({ liveTransformEnabled }),
      toggleGestures: gesturesEnabled => set({ gesturesEnabled }),
      toggleRulers: rulersEnabled => set({ rulersEnabled }),
    }),
    { name: STORAGE_KEY }
  )
);

export default useConfig;
