import { CronExpressionParser } from "cron-parser";

const MINUTES_IN_YEAR = 366 * 24 * 60;
const MAX_LOOKAHEAD_MS = MINUTES_IN_YEAR * 60 * 1000;
const MVP_FIELD_PATTERN = /^[\d*?,/-]+$/;

function isMvpFiveFieldCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5 && fields.every((field) => MVP_FIELD_PATTERN.test(field));
}

export function cronNext(expr: string, from: Date): Date | null {
  if (!isMvpFiveFieldCron(expr)) return null;

  try {
    const interval = CronExpressionParser.parse(expr, {
      currentDate: from,
      endDate: new Date(from.getTime() + MAX_LOOKAHEAD_MS),
      tz: "UTC",
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/** True when `expr` is a parseable 5-field cron expression. */
export function isValidCron(expr: string): boolean {
  if (!isMvpFiveFieldCron(expr)) return false;

  try {
    CronExpressionParser.parse(expr, { currentDate: new Date(0), tz: "UTC" });
    return true;
  } catch {
    return false;
  }
}
