-- 08: Paid-wall data quality
-- ------------------------------------------------------------------
-- Question: Is the STARTUP paid-wall event stream complete enough to trust
--           the 07 positioning conversion query?
-- Window:   Last 30 days (rolling)
-- Source:   analytics_events (PostHog replay)
-- Evidence:
--   1. license.wizard submitted rows carry STARTUP tier, team_size,
--      referral_source, and stable distinct_id.
--   2. checkout started/completed rows carry STARTUP tier, action, and a
--      checkout session identifier for joinability.
--   3. deployment.verified rows include smoke_status=passed before deploy
--      evidence is treated as conversion support.
-- ------------------------------------------------------------------

WITH startup_submitted AS (
  SELECT
    distinct_id,
    timestamp,
    properties
  FROM analytics_events
  WHERE event = 'license.wizard'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND COALESCE(properties->>'tier', properties->>'license_tier') = 'STARTUP'
    AND COALESCE(properties->>'step', properties->>'action') = 'submitted'
),
checkout_events AS (
  SELECT
    distinct_id,
    timestamp,
    properties
  FROM analytics_events
  WHERE event = 'checkout'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND COALESCE(properties->>'tier', properties->>'license_tier') = 'STARTUP'
    AND properties->>'action' IN ('started', 'completed')
),
deployment_events AS (
  SELECT
    distinct_id,
    timestamp,
    properties
  FROM analytics_events
  WHERE event = 'deployment.verified'
    AND timestamp >= NOW() - INTERVAL '30 days'
)
SELECT
  NOW() AS evaluated_at,
  (SELECT COUNT(*) FROM startup_submitted) AS startup_submitted_n,
  (SELECT COUNT(*) FROM startup_submitted WHERE NULLIF(distinct_id, '') IS NULL)
    AS startup_missing_distinct_id_n,
  (SELECT COUNT(*) FROM startup_submitted WHERE properties->>'team_size' IS NULL)
    AS startup_missing_team_size_n,
  (SELECT COUNT(*) FROM startup_submitted WHERE properties->>'referral_source' IS NULL)
    AS startup_missing_referral_source_n,
  (SELECT COUNT(*) FROM checkout_events WHERE properties->>'action' = 'started')
    AS checkout_started_n,
  (SELECT COUNT(*) FROM checkout_events WHERE properties->>'action' = 'completed')
    AS checkout_completed_n,
  (
    SELECT COUNT(*)
    FROM checkout_events
    WHERE COALESCE(properties->>'checkout_session_id', properties->>'session_id') IS NULL
  ) AS checkout_missing_session_id_n,
  (
    SELECT COUNT(*)
    FROM checkout_events
    WHERE NULLIF(distinct_id, '') IS NULL
      AND properties->>'userId' IS NULL
  ) AS checkout_missing_join_identity_n,
  (SELECT COUNT(*) FROM deployment_events WHERE properties->>'smoke_status' = 'passed')
    AS deployment_smoke_passed_n,
  (SELECT COUNT(*) FROM deployment_events WHERE properties->>'smoke_status' IS NULL)
    AS deployment_missing_smoke_status_n,
  (
    SELECT ROUND(
      COUNT(*) FILTER (
        WHERE properties->>'team_size' IS NOT NULL
          AND properties->>'referral_source' IS NOT NULL
          AND NULLIF(distinct_id, '') IS NOT NULL
      )::numeric / NULLIF(COUNT(*), 0) * 100,
      2
    )
    FROM startup_submitted
  ) AS startup_submitted_required_field_pct,
  (
    SELECT ROUND(
      COUNT(*) FILTER (
        WHERE COALESCE(properties->>'checkout_session_id', properties->>'session_id') IS NOT NULL
          AND (NULLIF(distinct_id, '') IS NOT NULL OR properties->>'userId' IS NOT NULL)
      )::numeric / NULLIF(COUNT(*), 0) * 100,
      2
    )
    FROM checkout_events
  ) AS checkout_joinable_pct;
