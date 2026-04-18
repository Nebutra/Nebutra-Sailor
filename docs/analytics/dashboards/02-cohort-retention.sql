-- 02: Cohort retention by scaffold cohort
-- ------------------------------------------------------------------
-- Question: For users who first scaffold on day X, how many return
--           at D1 / D7 / D30 to do a licensing or Sleptons action?
-- Window:   Cohorts from the last 90 days
-- Source:   analytics_events (PostHog replay)
-- Notes:    d0_users = same-day activity; d1/d7/d30 are cumulative
--           (reached within that number of days since scaffold).
-- ------------------------------------------------------------------

WITH cohorts AS (
  SELECT
    distinct_id,
    DATE_TRUNC('day', MIN(timestamp)) AS cohort_day
  FROM analytics_events
  WHERE event = 'scaffold.completed'
  GROUP BY distinct_id
),
activities AS (
  SELECT
    distinct_id,
    DATE_TRUNC('day', timestamp) AS activity_day
  FROM analytics_events
  WHERE event IN ('license.wizard', 'license.cli', 'sleptons')
    AND timestamp >= NOW() - INTERVAL '90 days'
  GROUP BY distinct_id, DATE_TRUNC('day', timestamp)
),
cohort_activity AS (
  SELECT
    c.cohort_day,
    c.distinct_id,
    a.activity_day,
    EXTRACT(DAY FROM (a.activity_day - c.cohort_day))::int AS days_since_scaffold
  FROM cohorts c
  JOIN activities a
    ON a.distinct_id = c.distinct_id
   AND a.activity_day >= c.cohort_day
)
SELECT
  cohort_day,
  COUNT(DISTINCT distinct_id) FILTER (WHERE days_since_scaffold = 0)               AS d0_users,
  COUNT(DISTINCT distinct_id) FILTER (WHERE days_since_scaffold BETWEEN 0 AND 1)   AS d1_users,
  COUNT(DISTINCT distinct_id) FILTER (WHERE days_since_scaffold BETWEEN 0 AND 7)   AS d7_users,
  COUNT(DISTINCT distinct_id) FILTER (WHERE days_since_scaffold BETWEEN 0 AND 30)  AS d30_users
FROM cohort_activity
WHERE cohort_day >= NOW() - INTERVAL '90 days'
GROUP BY cohort_day
ORDER BY cohort_day DESC;
