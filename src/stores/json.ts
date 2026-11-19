import { create } from "zustand";

interface JsonStates {
  json: string;
}

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  clear: () => void;
}

const initialStates: JsonStates = {
  json: "{}",
};

/** The parsed/pretty-printed JSON string consumed by the graph renderer. */
const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  getJson: () => get().json,
  setJson: json => set({ json }),
  clear: () => set({ json: "" }),
}));

export default useJson;
