/**
 * Single global queue. All requests routed through it run **one at a time**,
 * which keeps the backend from rate-limiting (429) when several sites are
 * loaded.
 *
 * Two helpers:
 * - `runSequentially(fn)`: for promise-based requests (e.g. `fetch`).
 * - `runStreamSequentially(start)`: for callback-based work like SSE.
 *   The caller MUST invoke `done` exactly once when the work is finished
 *   (complete, error, or abort) so the chain can advance.
 */
let chain: Promise<unknown> = Promise.resolve();

export function runSequentially<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(() => fn());
  chain = next.catch(() => {
    /* keep chain alive */
  });
  return next;
}

export function runStreamSequentially(start: (done: () => void) => void): void {
  chain = chain
    .then(
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
    )
    .catch(() => {
      /* keep chain alive */
    });
}
