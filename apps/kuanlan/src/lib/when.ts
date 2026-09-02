/**
 * Dates rendered by the server, in one fixed zone.
 *
 * These strings are produced during SSR, so without an explicit `timeZone` they
 * would read in whatever zone the origin happens to run in. The active origin is
 * Fly `sin`; a rollback moves it to Shanghai ECS. Pinning the zone keeps the same
 * moment printing the same way from either.
 */
const TZ = "Asia/Shanghai";

const DAY = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const DAY_TIME = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDay(date?: Date): string | null {
  return date ? DAY.format(date) : null;
}

export function formatDayTime(date?: Date): string | null {
  return date ? DAY_TIME.format(date) : null;
}
