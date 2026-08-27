-- 01: Scaffold → License funnel
-- ------------------------------------------------------------------
-- Question: Of users who scaffold, how many complete the license
--           wizard, activate a CLI key, and land in Sleptons?
-- Window:   Last 30 days (rolling)
-- Source:   analytics_events (PostHog replay)
-- Steps:
--   1. scaffold.completed
--   2. license.wizard (action=started)
--   3. license.wizard (action=submitted)
--   4. license.cli   (action=activated)
--   5. sleptons      (action=profile_viewed)
-- ------------------------------------------------------------------

WITH step_events AS (
  SELECT
    distinct_id,
    event,
    properties,
    timestamp,
    CASE
      WHEN event = 'scaffold.completed' THEN 1
      WHEN event = 'license.wizard' AND properties->>'step' = 'started' THEN 2
      WHEN event = 'license.wizard' AND properties->>'step' = 'submitted' THEN 3
      WHEN event = 'license.cli' AND properties->>'action' = 'activated' THEN 4
      WHEN event = 'sleptons' AND properties->>'action' = 'profile_viewed' THEN 5
      ELSE NULL
    END AS step
  FROM analytics_events
  WHERE timestamp >= NOW() - INTERVAL '30 days'
    AND event IN ('scaffold.completed', 'license.wizard', 'license.cli', 'sleptons')
),
user_steps AS (
  SELECT
    distinct_id,
    MAX(step) AS max_step_reached
  FROM step_events
  WHERE step IS NOT NULL
  GROUP BY distinct_id
),
funnel AS (
  SELECT 1 AS step_num, 'scaffold.completed'      AS step_label FROM user_steps WHERE max_step_reached >= 1
  UNION ALL
  SELECT 2,             'license.wizard.started'                FROM user_steps WHERE max_step_reached >= 2
  UNION ALL
  SELECT 3,             'license.wizard.submitted'              FROM user_steps WHERE max_step_reached >= 3
  UNION ALL
  SELECT 4,             'license.cli.activated'                 FROM user_steps WHERE max_step_reached >= 4
  UNION ALL
  SELECT 5,             'sleptons.first_action'                 FROM user_steps WHERE max_step_reached >= 5
),
counted AS (
  SELECT
    step_num,
    step_label,
    COUNT(*) AS users_reached
  FROM funnel
  GROUP BY step_num, step_label
)
SELECT
  step_num,
  step_label,
  users_reached,
  ROUND(
    users_reached::numeric
    / NULLIF(FIRST_VALUE(users_reached) OVER (ORDER BY step_num), 0)
    * 100,
    2
  ) AS conversion_pct
FROM counted
ORDER BY step_num;
