import { create } from "zustand";
import { debounce, fetchJsonDocument } from "../lib/helpers";
import exampleJson from "../data/example.json";
import { FileFormat } from "../enums";
import { jsonToContent } from "../lib/jsonAdapter";
import { contentToJsonAsync } from "../lib/parseWorker";
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

const hasJsonUrlParam = () =>
  new URLSearchParams(window.location.search).has("json");

const debouncedUpdateJson = debounce((value: unknown) => {
  useJson.getState().setJson(value);
}, 400);

const persistSessionNow = (contents: string, format: FileFormat) => {
  sessionStore.set("content", contents);
  sessionStore.set("format", format);
};

/** Writing sessionStorage is synchronous; coalesce keystrokes instead of
 * persisting on every character. */
const debouncedPersistSession = debounce(persistSessionNow, 400);

/** Monotonic ids make late async parses/conversions safe to discard. */
let parseRequestId = 0;
let formatRequestId = 0;

interface FileActions {
  getContents: () => string;
  getFormat: () => FileFormat;
  setError: (error: string | null) => void;
  setContents: (data: SetContents) => Promise<void>;
  fetchUrl: (url: string) => Promise<void>;
  /** Resolves to `false` when the conversion failed and the format was kept. */
  setFormat: (format: FileFormat) => Promise<boolean>;
  setJsonSchema: (jsonSchema: object | null) => void;
  /** Write a pending debounced session save immediately (pagehide). */
  flushSession: () => void;
  /** Downloading a file counts as saving: clear the unload warning and flush
   * the session copy so a following close cannot lose the latest keystrokes. */
  markExported: () => void;
  checkEditorSession: (url?: string | string[]) => void | Promise<void>;
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
  setJsonSchema: jsonSchema => set({ jsonSchema }),
  flushSession: () => debouncedPersistSession.flush(),
  markExported: () => {
    set({ hasChanges: false });
    debouncedPersistSession.flush();
  },
  getContents: () => get().contents,
  getFormat: () => get().format,
  setFormat: async format => {
    // Bump first: re-selecting the current format must cancel an in-flight
    // conversion (the format only changes after conversion succeeds).
    const requestId = ++formatRequestId;
    const prevFormat = get().format;
    if (format === prevFormat) return true;

    const previousContents = get().contents;
    try {
      const contentJson = await contentToJsonAsync(previousContents, prevFormat);
      if (requestId !== formatRequestId || get().contents !== previousContents) return false;

      const jsonContent = await jsonToContent(contentJson, format);
      if (requestId !== formatRequestId || get().contents !== previousContents) return false;

      set({ format });
      await get().setContents({ contents: jsonContent });
      return true;
    } catch (error) {
      // Keep the document untouched: a failed conversion must not destroy it.
      console.warn(`Unable to convert the document to ${format}.`, error);
      return false;
    }
  },
  setContents: async ({ contents, hasChanges = true, skipUpdate = false, format }) => {
    const requestId = ++parseRequestId;
    try {
      set({
        // `""` is a valid value (the user cleared the editor) — only skip
        // `undefined`, which means "keep the current contents".
        ...(contents !== undefined && { contents }),
        error: null,
        hasChanges,
        format: format ?? get().format,
      });

      const { contents: currentContents, format: currentFormat } = get();

      // An emptied document must clear the graph too, otherwise it keeps
      // rendering the previous parse result. Cancel the pending debounced
      // update so it cannot resurrect that result 400 ms later.
      if (!currentContents.trim()) {
        debouncedUpdateJson.cancel();
        useJson.getState().setJson({});
        persistSession(contents, hasChanges, currentFormat);
        return;
      }

      const json = await contentToJsonAsync(currentContents, currentFormat);
      if (requestId !== parseRequestId) return;

      if (!useConfig.getState().liveTransformEnabled && skipUpdate) return;

      persistSession(contents, hasChanges, currentFormat);
      debouncedUpdateJson(json ?? null);
    } catch (error: any) {
      if (requestId !== parseRequestId) return;
      if (error?.snippet) set({ error: error.snippet });
      else if (error?.mark?.snippet) set({ error: error.mark.snippet });
      else if (error?.message) set({ error: error.message });
    }
  },
  setError: error => set({ error }),
  fetchUrl: async url => {
    const parsed = await fetchJsonDocument(url);
    const jsonStr = JSON.stringify(parsed, null, 2);
    // Set the graph immediately; setContents below still refreshes editor
    // state (format, session persistence) without another visible delay.
    useJson.getState().setJson(parsed);
    await get().setContents({
      contents: jsonStr,
      format: FileFormat.JSON,
      hasChanges: false,
    });
  },
  checkEditorSession: (url?: string | string[]) => {
    if (typeof url === "string" && isURL(url)) {
      return get().fetchUrl(url);
    }

    let contents = defaultJson;
    const sessionContent = sessionStore.get("content");
    const format = sessionStore.get("format") as FileFormat | null;
    // An empty string is a real saved state (cleared editor); only `null`
    // means "nothing stored yet".
    if (sessionContent !== null) contents = sessionContent;

    if (format) set({ format });
    get().setContents({ contents, hasChanges: false });
  },
}));

/** Persist the editor contents for session restore (debounced). */
const persistSession = (
  explicitContents: string | undefined,
  hasChanges: boolean,
  format: FileFormat
) => {
  // A state that must not be persisted (import / URL bootstrap) also cancels
  // any pending save of the previous document.
  if (!hasChanges) {
    debouncedPersistSession.cancel();
    return;
  }
  if (explicitContents === undefined) return;
  if (explicitContents.length >= 80_000 || hasJsonUrlParam()) {
    debouncedPersistSession.cancel();
    return;
  }
  debouncedPersistSession(explicitContents, format);
};

export default useFile;
