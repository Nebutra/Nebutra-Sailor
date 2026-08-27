/**
 * Storybook stub for `next/headers` (server-only APIs).
 *
 * If a story reaches into `cookies()` / `headers()` / `draftMode()`, that
 * story is pulling in a Server Component path that shouldn't render in the
 * browser. The stub returns empty / safe defaults and logs a warning so the
 * author can refactor the story to mount the client subtree directly.
 */

type CookieValue = { name: string; value: string };

type CookieStore = {
  get: (name: string) => CookieValue | undefined;
  getAll: () => CookieValue[];
  has: (name: string) => boolean;
  set: (...args: unknown[]) => void;
  delete: (...args: unknown[]) => void;
};

const warnedFor = new Set<string>();
function warnOnce(api: string): void {
  if (warnedFor.has(api)) return;
  warnedFor.add(api);
  // biome-ignore lint/suspicious/noConsole: explicit Storybook hint
  console.warn(
    `[storybook/next-headers stub] ${api}() called from a story. ` +
      "This indicates a Server Component path leaked into a browser story. " +
      "Refactor the story to mount the Client Component subtree directly.",
  );
}

export function cookies(): CookieStore {
  warnOnce("cookies");
  return {
    get: () => undefined,
    getAll: () => [],
    has: () => false,
    set: () => {},
    delete: () => {},
  };
}

export function headers(): Headers {
  warnOnce("headers");
  return new Headers();
}

export function draftMode(): { isEnabled: boolean; enable: () => void; disable: () => void } {
  warnOnce("draftMode");
  return { isEnabled: false, enable: () => {}, disable: () => {} };
}
