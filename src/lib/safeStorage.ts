/** Storage access that never throws.
 *
 * In restricted contexts (cross-origin iframes, hardened privacy modes,
 * "block all cookies" settings) merely *touching* `localStorage` /
 * `sessionStorage` invokes a getter that throws SecurityError. The access
 * must therefore happen INSIDE the try block — `typeof storage` alone is
 * not a safe guard because it evaluates the global and can throw too.
 * Falls back to an in-memory map so the app keeps working for the session. */

const memory = new Map<string, string>();

const tryStore = (kind: "local" | "session", op: "get" | "set", key: string, value?: string) => {
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    if (op === "get") return store?.getItem(key) ?? null;
    store?.setItem(key, value!);
  } catch {
    /* storage unavailable or access denied — memory fallback below */
  }
  if (op === "get") return memory.get(key) ?? null;
  memory.set(key, value!);
  return undefined;
};

export const localStore = {
  get: (key: string) => tryStore("local", "get", key) as string | null,
  set: (key: string, value: string) => void tryStore("local", "set", key, value),
};

export const sessionStore = {
  get: (key: string) => tryStore("session", "get", key) as string | null,
  set: (key: string, value: string) => void tryStore("session", "set", key, value),
};
