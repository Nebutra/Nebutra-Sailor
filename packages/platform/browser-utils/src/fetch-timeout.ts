/**
 * fetch() with AbortSignal timeout. Prefer this over bare fetch for product paths.
 */

export class FetchTimeoutError extends Error {
  readonly name = "FetchTimeoutError";
  constructor(
    message: string,
    readonly timeoutMs: number,
  ) {
    super(message);
  }
}

export type FetchWithTimeoutInit = RequestInit & {
  /** Abort after this many ms. Default 15_000. */
  timeoutMs?: number;
};

/**
 * fetch with a hard deadline. Merges with an existing `signal` via AbortSignal.any
 * when available; otherwise races timers.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
): Promise<Response> {
  const { timeoutMs = 15_000, signal: outer, ...rest } = init;

  if (timeoutMs <= 0) {
    return fetch(input, { ...rest, signal: outer ?? null });
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onOuterAbort = () => controller.abort();
  if (outer) {
    if (outer.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      outer.addEventListener("abort", onOuterAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (error) {
    if (timedOut || (error instanceof DOMException && error.name === "AbortError" && timedOut)) {
      throw new FetchTimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}
