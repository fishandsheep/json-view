/**
 * Off-main-thread parser. Lives in a Worker so typing in a large document does
 * not block the UI thread with JSON/YAML/XML/CSV parsing.
 *
 * The parsers are dynamically imported by `contentToJson`; Vite emits them as
 * separate chunks loaded by the worker on demand.
 */
import { contentToJson } from "../lib/jsonAdapter";
import type { FileFormat } from "../enums";

export interface ParseWorkerRequest {
  id: number;
  value: string;
  format: FileFormat;
}

export type ParseWorkerResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: { message: string; snippet?: string } };

const post = (message: ParseWorkerResponse) =>
  (self as unknown as { postMessage: (message: ParseWorkerResponse) => void }).postMessage(
    message
  );

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const { id, value, format } = event.data;
  try {
    const result = await contentToJson(value, format);
    post({ id, ok: true, value: result });
  } catch (error) {
    const err = error as { message?: string; mark?: { snippet?: string } };
    post({
      id,
      ok: false,
      error: {
        message: err?.message || "Unable to parse the document.",
        snippet: err?.mark?.snippet,
      },
    });
  }
};
