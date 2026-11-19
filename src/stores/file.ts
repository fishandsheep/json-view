import { create } from "zustand";
import { debounce } from "../lib/helpers";
import exampleJson from "../data/example.json";
import { FileFormat } from "../enums";
import { contentToJson, jsonToContent } from "../lib/jsonAdapter";
import { sessionStore } from "../lib/safeStorage";
import useConfig from "./config";
import useJson from "./json";

const defaultJson = JSON.stringify(exampleJson, null, 2);

type SetContents = {
  contents?: string;
  hasChanges?: boolean;
  skipUpdate?: boolean;
  format?: FileFormat;
};

const isURL = (value: string) =>
  /^https?:\/\/[^\s]+$/i.test(value.trim());

const debouncedUpdateJson = debounce((value: unknown) => {
  useJson.getState().setJson(JSON.stringify(value, null, 2));
}, 400);

interface FileActions {
  getContents: () => string;
  getFormat: () => FileFormat;
  setError: (error: string | null) => void;
  setContents: (data: SetContents) => void;
  fetchUrl: (url: string) => void;
  setFormat: (format: FileFormat) => void;
  clear: () => void;
  setJsonSchema: (jsonSchema: object | null) => void;
  checkEditorSession: (url?: string | string[]) => void;
}

const initialStates = {
  format: FileFormat.JSON as FileFormat,
  contents: defaultJson,
  error: null as string | null,
  hasChanges: false,
  jsonSchema: null as object | null,
};

const useFile = create<typeof initialStates & FileActions>()((set, get) => ({
  ...initialStates,
  clear: () => {
    set({ contents: "" });
    useJson.getState().clear();
  },
  setJsonSchema: jsonSchema => set({ jsonSchema }),
  getContents: () => get().contents,
  getFormat: () => get().format,
  setFormat: async format => {
    try {
      const prevFormat = get().format;
      set({ format });
      const contentJson = await contentToJson(get().contents, prevFormat);
      const jsonContent = await jsonToContent(
        JSON.stringify(contentJson, null, 2),
        format
      );
      get().setContents({ contents: jsonContent });
    } catch {
      get().clear();
      console.warn("The content was unable to be converted, so it was cleared instead.");
    }
  },
  setContents: async ({ contents, hasChanges = true, skipUpdate = false, format }) => {
    try {
      set({
        ...(contents && { contents }),
        error: null,
        hasChanges,
        format: format ?? get().format,
      });

      const json = await contentToJson(get().contents, get().format);

      // An emptied document must clear the graph too, otherwise it keeps
      // rendering the previous parse result.
      if (!get().contents.trim()) {
        debouncedUpdateJson({});
        return;
      }

      if (!useConfig.getState().liveTransformEnabled && skipUpdate) return;

      if (
        get().hasChanges &&
        contents &&
        contents.length < 80_000 &&
        window.location.search === ""
      ) {
        sessionStore.set("content", contents);
        sessionStore.set("format", get().format);
      }

      debouncedUpdateJson(json);
    } catch (error: any) {
      if (error?.mark?.snippet) set({ error: error.mark.snippet });
      else if (error?.message) set({ error: error.message });
    }
  },
  setError: error => set({ error }),
  fetchUrl: async url => {
    try {
      const res = await fetch(url);
      const json = await res.json();
      const jsonStr = JSON.stringify(json, null, 2);
      // Set the graph immediately; setContents below still refreshes editor
      // state (format, session persistence) without another visible delay.
      useJson.getState().setJson(jsonStr);
      get().setContents({ contents: jsonStr, hasChanges: false });
    } catch {
      get().clear();
      throw new Error("Failed to fetch document from URL!");
    }
  },
  checkEditorSession: (url?: string | string[]) => {
    if (typeof url === "string" && isURL(url)) {
      return get().fetchUrl(url);
    }

    let contents = defaultJson;
    const sessionContent = sessionStore.get("content");
    const format = sessionStore.get("format") as FileFormat | null;
    if (sessionContent) contents = sessionContent;

    if (format) set({ format });
    get().setContents({ contents, hasChanges: false });
  },
}));

export default useFile;
