// Dependency-free next-fire-time for a standard 5-field cron expression
// (minute hour day-of-month month day-of-week), evaluated in UTC. Supports
// "*", lists "a,b", ranges "a-b", and step syntax (slash-n). Returns the next
// UTC Date after `from`, or null for a malformed expression / no match within
// a year. Timezone-aware evaluation (Automation.timezone) is a follow-up; UTC at MVP.

function parseField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    let step = 1;
    let range = part;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      step = Number.parseInt(part.slice(slash + 1), 10);
      range = part.slice(0, slash);
      if (!Number.isFinite(step) || step <= 0) return null;
    }
    let lo = min;
    let hi = max;
    if (range !== "*" && range !== "?") {
      const dash = range.indexOf("-");
      if (dash !== -1) {
        lo = Number.parseInt(range.slice(0, dash), 10);
        hi = Number.parseInt(range.slice(dash + 1), 10);
      } else {
        lo = Number.parseInt(range, 10);
        hi = lo;
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) {
        return null;
      }
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

const MINUTES_IN_YEAR = 366 * 24 * 60;

export function cronNext(expr: string, from: Date): Date | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [mF, hF, domF, monF, dowF] = fields as [string, string, string, string, string];

  const mins = parseField(mF, 0, 59);
  const hours = parseField(hF, 0, 23);
  const doms = parseField(domF, 1, 31);
  const mons = parseField(monF, 1, 12);
  const dows = parseField(dowF, 0, 6); // 0 = Sunday
  if (!mins || !hours || !doms || !mons || !dows) return null;

  const domRestricted = domF !== "*" && domF !== "?";
  const dowRestricted = dowF !== "*" && dowF !== "?";

  const d = new Date(from.getTime());
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);

  for (let i = 0; i < MINUTES_IN_YEAR; i++) {
    const month = d.getUTCMonth() + 1;
    if (mons.has(month) && hours.has(d.getUTCHours()) && mins.has(d.getUTCMinutes())) {
      const domMatch = doms.has(d.getUTCDate());
      const dowMatch = dows.has(d.getUTCDay());
      // Standard cron: when both DOM and DOW are restricted, match EITHER.
      const dayOk =
        domRestricted && dowRestricted
          ? domMatch || dowMatch
          : domRestricted
            ? domMatch
            : dowRestricted
              ? dowMatch
              : true;
      if (dayOk) return new Date(d.getTime());
    }
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return null;
}

/** True when `expr` is a parseable 5-field cron expression. */
export function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [m, h, dom, mon, dow] = fields as [string, string, string, string, string];
  return (
    parseField(m, 0, 59) !== null &&
    parseField(h, 0, 23) !== null &&
    parseField(dom, 1, 31) !== null &&
    parseField(mon, 1, 12) !== null &&
    parseField(dow, 0, 6) !== null
  );
}
