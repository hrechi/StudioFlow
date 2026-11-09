import "server-only";
import type { Readable } from "node:stream";
import { Zip, ZipPassThrough } from "fflate";

/**
 * Node stream → web ReadableStream, for Route Handler responses (files from GridFS).
 *
 * Replaces `Readable.toWeb()`, which crashes the server with "Invalid state: Controller is
 * already closed" (an uncaughtException) when the browser cancels a download mid-way — e.g.
 * changing page while photos load. Here a cancel stops and destroys the source, and nothing is
 * ever pushed into a closed stream. Backpressure: the source pauses while the browser is slow,
 * so a large file is never held in memory.
 */
export function nodeStreamToWeb(source: Readable): ReadableStream<Uint8Array> {
  let done = false;
  const finish = () => {
    done = true;
    source.removeAllListeners("data");
  };
  return new ReadableStream<Uint8Array>({
    start(controller) {
      source.on("data", (chunk: Buffer | string) => {
        if (done) return;
        try {
          controller.enqueue(
            typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk),
          );
        } catch {
          // The stream was closed meanwhile (browser gone): stop reading.
          finish();
          source.destroy();
          return;
        }
        if ((controller.desiredSize ?? 1) <= 0) source.pause();
      });
      source.once("end", () => {
        if (done) return;
        finish();
        try {
          controller.close();
        } catch {
          // Already closed by a cancel.
        }
      });
      source.once("error", (error) => {
        if (done) return;
        finish();
        try {
          controller.error(error);
        } catch {
          // Already closed by a cancel.
        }
      });
    },
    pull() {
      source.resume();
    },
    cancel() {
      finish();
      source.destroy();
    },
  });
}

export type ZipSource = {
  nomFichier: string;
  read: () => Promise<AsyncIterable<Uint8Array>>;
};

/** Same file name twice in a ZIP → "name (2).jpg". */
function uniqueName(name: string, used: Map<string, number>): string {
  const count = (used.get(name) ?? 0) + 1;
  used.set(name, count);
  if (count === 1) return name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
}

/**
 * Files → one ZIP, streamed (photos are already compressed: entries are stored, not deflated).
 * Cancel-safe like `nodeStreamToWeb`: if the browser leaves, reading stops at the next chunk and
 * nothing is pushed into the closed stream. Reading waits while the consumer is slow.
 */
export function zipToWebStream(files: ZipSource[]): ReadableStream<Uint8Array> {
  let cancelled = false;
  let wake: (() => void) | null = null;
  const resume = () => {
    wake?.();
    wake = null;
  };
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (cancelled) return;
        try {
          if (error) return controller.error(error);
          controller.enqueue(chunk);
          if (final) controller.close();
        } catch {
          cancelled = true;
        }
      });
      const used = new Map<string, number>();
      try {
        for (const file of files) {
          if (cancelled) return;
          const entry = new ZipPassThrough(uniqueName(file.nomFichier, used));
          zip.add(entry);
          for await (const chunk of await file.read()) {
            if (cancelled) return;
            entry.push(new Uint8Array(chunk));
            if ((controller.desiredSize ?? 1) <= 0) await new Promise<void>((r) => (wake = r));
          }
          entry.push(new Uint8Array(0), true);
        }
        zip.end();
      } catch (error) {
        if (cancelled) return;
        cancelled = true;
        try {
          controller.error(error);
        } catch {
          // Already closed.
        }
      }
    },
    pull() {
      resume();
    },
    cancel() {
      cancelled = true;
      resume();
    },
  });
}
