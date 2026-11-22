/** Minimal debounce (mirrors lodash.debounce usage in the original app). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | null = null;
  const run = () => {
    t = undefined;
    const args = lastArgs;
    lastArgs = null;
    if (args) fn(...args);
  };
  const debounced = (...args: A) => {
    lastArgs = args;
    clearTimeout(t);
    t = setTimeout(run, wait);
  };
  /** Drop a pending invocation (used when the document is cleared). */
  debounced.cancel = () => {
    clearTimeout(t);
    t = undefined;
    lastArgs = null;
  };
  /** Run a pending invocation now (used on pagehide before the tab closes). */
  debounced.flush = () => {
    if (t === undefined) return;
    clearTimeout(t);
    run();
  };
  return debounced;
}

/** Upper bound for imported documents, matching the original app. */
export const MAX_IMPORT_SIZE = 300 * 1024;

/** Fetch a remote document, enforcing the import cap and JSON validity. */
export const fetchJsonDocument = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: HTTP ${response.status}.`);
  }
  const text = await response.text();
  if (text.length > MAX_IMPORT_SIZE) {
    throw new Error(`File too large (max ${MAX_IMPORT_SIZE / 1024} KB).`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The URL did not return valid JSON.");
  }
};

/** True when a keyboard event target is a text field or the Monaco editor. */
export const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest(
    "input, textarea, select, [contenteditable=''], [contenteditable='true']"
  );
};

export const downloadTextFile = (contents: string, filename: string) => {
  const a = document.createElement("a");
  const file = new Blob([contents], { type: "text/plain" });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
};
