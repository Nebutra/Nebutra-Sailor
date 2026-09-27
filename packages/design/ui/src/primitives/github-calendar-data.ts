/**
 * GitHubCalendar's data model and adapters — plain functions, no React.
 *
 * They live apart from the component because the component is a client
 * module: a server component that called fromWeeklyCommitActivity() through
 * it got "Attempted to call … from the server but it is on the client".
 */

/**
 * Single contribution day data
 */
export interface ContributionDay {
  /** ISO date string (e.g., "2025-09-13") */
  date: string;
  /** Number of contributions on this day */
  count: number;
}

/**
 * Maps a contribution count to a level index (0 = empty, up to
 * `levelCount - 1` = most active). Shared between the inline-style color
 * path (custom `colors`) and the token-class path (default ramp), and
 * exported so data adapters/tests can predict which cell a count lands in.
 */
export function getContributionLevel(count: number, thresholds?: number[], levelCount = 5): number {
  if (thresholds && thresholds.length === levelCount) {
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (count >= (thresholds[i] ?? 0)) return i;
    }
    return 0;
  }

  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return Math.min(4, levelCount - 1);
}

/**
 * One entry of GitHub's REST `GET /repos/{owner}/{repo}/stats/commit_activity`
 * response: a week of commit counts.
 */
export interface WeeklyCommitActivity {
  /** Unix timestamp (seconds) of the Sunday that starts this week, UTC. */
  week: number;
  /** Commit counts for each day of the week, Sunday through Saturday. */
  days: number[];
  /** Sum of `days`, provided by the API but not required by the adapter. */
  total?: number;
}

/**
 * Converts GitHub's weekly commit-activity stats into the flat
 * `ContributionDay[]` shape `GitHubCalendar` consumes.
 *
 * Dates are derived in UTC (`week` is UTC midnight Sunday, `days[i]` is
 * `week + i` days), so the mapping is deterministic regardless of the
 * caller's local timezone.
 */
export function fromWeeklyCommitActivity(weeks: WeeklyCommitActivity[]): ContributionDay[] {
  const result: ContributionDay[] = [];

  for (const { week, days } of weeks) {
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const date = new Date(week * 1000 + dayIndex * 86_400_000).toISOString().slice(0, 10);
      result.push({ date, count: days[dayIndex] ?? 0 });
    }
  }

  return result;
}
