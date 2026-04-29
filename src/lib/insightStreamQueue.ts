/**
 * Serializes all `generate_insight` (EventSource) connections so only one
 * runs at a time, reducing 429s from the backend.
 */
let chain: Promise<void> = Promise.resolve();

/**
 * Runs `start` when no other insight stream is active. `start` must call
 * `done` exactly once when the stream is finished (complete, error, or
 * caller abort) so the next job can run.
 */
export function runWhenInsightSlotAvailable(start: (done: () => void) => void): void {
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
