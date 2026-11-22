import type { FileFormat } from "../enums";
import { contentToJson } from "./jsonAdapter";
import type { ParseWorkerRequest, ParseWorkerResponse } from "../workers/parse.worker";

/**
 * Documents at or above this size are parsed in a Worker. Smaller documents
 * finish in well under a frame on the main thread, and avoiding the worker
 * round-trip keeps typing feedback immediate.
 */
const PARSE_WORKER_THRESHOLD = 20_000;

const WORKER_UNAVAILABLE = "__parse_worker_unavailable__";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, Pending>();

const rejectAll = (reason: Error) => {
  for (const request of pending.values()) request.reject(reason);
  pending.clear();
};

const getWorker = () => {
  if (worker) return worker;
  const created = new Worker(new URL("../workers/parse.worker.ts", import.meta.url), {
    type: "module",
  });
  created.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.ok) {
      request.resolve(event.data.value);
      return;
    }
    const error = new Error(event.data.error.message);
    (error as Error & { snippet?: string }).snippet = event.data.error.snippet;
    request.reject(error);
  };
  const onCrash = () => {
    created.terminate();
    if (worker === created) worker = null;
    rejectAll(new Error(WORKER_UNAVAILABLE));
  };
  created.onerror = onCrash;
  created.onmessageerror = onCrash;
  worker = created;
  return created;
};

const parseInWorker = (value: string, format: FileFormat): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, value, format } satisfies ParseWorkerRequest);
  });

/**
 * Parse `value` without blocking the main thread for large documents.
 * Falls back to the main thread when Workers are unavailable (tests, exotic
 * embedding contexts) or after an infrastructure-level worker crash.
 */
export const contentToJsonAsync = async (
  value: string,
  format: FileFormat
): Promise<unknown> => {
  if (typeof Worker === "undefined" || value.length < PARSE_WORKER_THRESHOLD) {
    return contentToJson(value, format);
  }
  try {
    return await parseInWorker(value, format);
  } catch (error) {
    // Parse errors (invalid document) are reported by the worker; only an
    // unavailable/crashed worker is retried on the main thread.
    if ((error as Error)?.message !== WORKER_UNAVAILABLE) throw error;
    return contentToJson(value, format);
  }
};
