import { create } from "zustand";

interface JsonStates {
  /** Canonical, pretty-printed JSON text (export, WASM inputs). */
  json: string;
  /** The parsed value — the single parse result shared by the graph, tree
   * view and tool modals, so they never re-parse the document themselves. */
  parsed: unknown;
}

interface JsonActions {
  /** Accepts any parsed JSON value (including a root string/number). */
  setJson: (json: unknown) => void;
  getJson: () => string;
  getParsed: () => unknown;
}

const initialStates: JsonStates = {
  json: "{}",
  parsed: {},
};

const toPrettyText = (value: unknown) => {
  try {
    const text = JSON.stringify(value, null, 2);
    return text === undefined ? "null" : text;
  } catch {
    return "{}";
  }
};

/** The parsed/pretty-printed document consumed by the graph renderer. */
const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,
  setJson: value => {
    set({ json: toPrettyText(value), parsed: value ?? null });
  },
  getJson: () => get().json,
  getParsed: () => get().parsed,
}));

export default useJson;
