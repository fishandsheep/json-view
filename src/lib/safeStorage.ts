/** Storage access that never throws.
 *
 * In restricted contexts (cross-origin iframes, hardened privacy modes,
 * "block all cookies" settings) merely *touching* `localStorage` /
 * `sessionStorage` invokes a getter that throws SecurityError. The access
 * must therefore happen INSIDE the try block — `typeof storage` alone is
 * not a safe guard because it evaluates the global and can throw too.
 * Falls back to an in-memory map so the app keeps working for the session. */

const memory = new Map<string, string>();

const tryStore = (
  kind: "local" | "session",
  op: "get" | "set" | "remove",
  key: string,
  value?: string
) => {
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    if (op === "get") return store?.getItem(key) ?? null;
    if (op === "set") store?.setItem(key, value!);
    else store?.removeItem(key);
  } catch {
    /* storage unavailable or access denied — memory fallback below */
  }
  if (op === "get") return memory.get(key) ?? null;
  if (op === "set") memory.set(key, value!);
  else memory.delete(key);
  return undefined;
};

/** localStorage adapter for zustand's persist middleware (never throws). */
export const safeStorage = {
  getItem: (key: string) => tryStore("local", "get", key) as string | null,
  setItem: (key: string, value: string) => void tryStore("local", "set", key, value),
  removeItem: (key: string) => void tryStore("local", "remove", key),
};

export const sessionStore = {
  get: (key: string) => tryStore("session", "get", key) as string | null,
  set: (key: string, value: string) => void tryStore("session", "set", key, value),
};
