/**
 * Single global queue. All requests routed through it run **one at a time**,
 * with a small spacing delay between jobs to avoid backend 429s.
 *
 * Two helpers:
 * - `runSequentially(fn)`: for promise-based requests (e.g. `fetch`).
 * - `runStreamSequentially(start)`: for callback-based work like SSE. The
 *   caller MUST invoke `done` exactly once when the work is finished
 *   (complete, error, or abort) so the chain can advance.
 */
const QUEUE_SPACING_MS = 1000;

let chain: Promise<unknown> = Promise.resolve();

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function appendSpacer(p: Promise<unknown>): Promise<unknown> {
  return p.catch(() => {}).then(() => delay(QUEUE_SPACING_MS));
}

export function runSequentially<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(() => fn());
  chain = appendSpacer(next);
  return next;
}

export function runStreamSequentially(start: (done: () => void) => void): void {
  const work = chain.then(
    () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        try {
          start(done);
        } catch {
          done();
        }
      })
  );
  chain = appendSpacer(work);
}
