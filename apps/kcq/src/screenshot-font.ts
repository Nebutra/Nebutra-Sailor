/**
 * Instrument names in exported screenshots render in Noto Sans SC (OFL); the chart library ships no
 * CJK face. Its @font-face rules are ~31 KB gzipped, so they load when the browser is idle instead of
 * blocking the workbench. unicode-range slices mean a screenshot then fetches only the glyphs it draws.
 */
export function scheduleScreenshotFont(
  load: () => Promise<unknown> = () => import("@fontsource/noto-sans-sc/500.css"),
  target: Pick<Window, "setTimeout"> & Partial<Pick<Window, "requestIdleCallback">> = window,
): void {
  const run = () => void load().catch(() => {});
  if (typeof target.requestIdleCallback === "function") {
    target.requestIdleCallback(run, { timeout: 5_000 });
  } else {
    target.setTimeout(run, 2_000);
  }
}
