/**
 * Single global queue. Every request the app makes goes through this so that
 * no two backend calls are ever in flight at the same time. After each job
 * finishes (or errors), we wait `QUEUE_SPACING_MS` before the next job is
 * allowed to run, which keeps the backend from rate-limiting (HTTP 429).
 *
 * Helpers:
 * - `runSequentially(fn)`: promise-based work (e.g. `fetch`).
 * - `runStreamSequentially(start)`: callback-based work (e.g. EventSource).
 *   The caller MUST call `done` exactly once when the work is finished so
 *   the chain can advance.
 * - `fetchWithBackoff(input, init)`: drop-in `fetch` that retries on HTTP
 *   429 with exponential backoff (use INSIDE a queued job).
 */
const QUEUE_SPACING_MS = 1500;
const RETRY_DELAYS_MS = [1000, 2500, 5000];

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

export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    const res = await fetch(input, init);
    if (res.status !== 429) return res;
    last = res;
    if (i === RETRY_DELAYS_MS.length) return res;
    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfter = retryAfterRaw ? parseFloat(retryAfterRaw) : 0;
    const wait = retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAYS_MS[i]!;
    await delay(wait);
  }
  return last!;
}
