/** After a deploy, an old shell can reference chunks that no longer exist. Reload once to fetch the new shell. */
const RELOAD_KEY = "kcq:preload-reload-at";
const RELOAD_WINDOW_MS = 30_000;

export interface PreloadRecoveryEnv {
  storage: Pick<Storage, "getItem" | "setItem">;
  now: () => number;
  reload: () => void;
}

/** Returns true when it reloaded; false when a reload already happened recently, so the error surfaces instead of looping. */
export function recoverFromPreloadError(env: PreloadRecoveryEnv): boolean {
  let last = 0;
  try {
    last = Number(env.storage.getItem(RELOAD_KEY)) || 0;
  } catch {
    return false;
  }
  if (env.now() - last < RELOAD_WINDOW_MS) return false;
  try {
    env.storage.setItem(RELOAD_KEY, String(env.now()));
  } catch {
    return false;
  }
  env.reload();
  return true;
}

export function installPreloadRecovery(target: Window = window): void {
  target.addEventListener("vite:preloadError", (event) => {
    const reloaded = recoverFromPreloadError({
      storage: target.sessionStorage,
      now: () => Date.now(),
      reload: () => target.location.reload(),
    });
    if (reloaded) event.preventDefault();
  });
}
