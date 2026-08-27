-- 07: Positioning paid-wall validation
-- ------------------------------------------------------------------
-- Question: For STARTUP-eligible teams, how many move from commercial
--           intent to Stripe checkout and paid completion within 30 days?
-- Window:   Last 30 days (rolling)
-- Source:   analytics_events (PostHog replay)
-- Evidence:
--   1. scaffold.completed                         -- install/scaffold
--   2. license.wizard step=submitted tier=STARTUP -- 2-50 team commercial line
--   3. checkout action=started tier=STARTUP       -- Stripe checkout opened
--   4. checkout action=completed tier=STARTUP     -- paid
--   5. deployment.verified                        -- ECS CI/CD smoke-proven deploys
-- Notes:
--   deployment.verified is counted as deployment evidence after public smoke
--   tests pass. Team-level deploy attribution requires generated/downstream
--   apps to emit deployment.verified with a stable team/user distinct_id.
-- ------------------------------------------------------------------

WITH scaffolded AS (
  SELECT
    distinct_id,
    MIN(timestamp) AS scaffolded_at,
    MAX(properties->>'deploy_target') AS scaffold_deploy_target
  FROM analytics_events
  WHERE event = 'scaffold.completed'
    AND timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY distinct_id
),
startup_commercial AS (
  SELECT
    distinct_id,
    MIN(timestamp) AS commercial_triggered_at,
    MAX(properties->>'role') AS role,
    MAX(properties->>'team_size') AS team_size,
    MAX(properties->>'referral_source') AS referral_source
  FROM analytics_events
  WHERE event = 'license.wizard'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND COALESCE(properties->>'tier', properties->>'license_tier') = 'STARTUP'
    AND COALESCE(properties->>'step', properties->>'action') = 'submitted'
  GROUP BY distinct_id
),
checkout_started AS (
  SELECT
    distinct_id,
    MIN(timestamp) AS checkout_started_at,
    MAX(COALESCE(properties->>'checkout_session_id', properties->>'session_id')) AS checkout_session_id
  FROM analytics_events
  WHERE event = 'checkout'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND COALESCE(properties->>'tier', properties->>'license_tier') = 'STARTUP'
    AND properties->>'action' = 'started'
  GROUP BY distinct_id
),
startup_paid AS (
  SELECT
    COALESCE(properties->>'userId', distinct_id) AS paid_identity,
    MIN(timestamp) AS paid_at,
    MAX(COALESCE(properties->>'checkout_session_id', properties->>'session_id')) AS paid_checkout_session_id,
    MAX(properties->>'currency') AS paid_currency,
    MAX(
      CASE
        WHEN COALESCE(properties->>'amount_cents', properties->>'amount_total') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN COALESCE(properties->>'amount_cents', properties->>'amount_total')::numeric
        ELSE NULL
      END
    ) AS paid_amount_cents
  FROM analytics_events
  WHERE event = 'checkout'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND COALESCE(properties->>'tier', properties->>'license_tier') = 'STARTUP'
    AND properties->>'action' = 'completed'
  GROUP BY COALESCE(properties->>'userId', distinct_id)
),
verified_deployments AS (
  SELECT
    COUNT(*) AS deploy_events_30d,
    COUNT(DISTINCT properties->>'app') AS deployed_apps_30d,
    MAX(timestamp) AS latest_deploy_verified_at
  FROM analytics_events
  WHERE event = 'deployment.verified'
    AND timestamp >= NOW() - INTERVAL '30 days'
    AND properties->>'smoke_status' = 'passed'
),
team_rows AS (
  SELECT
    COALESCE(c.distinct_id, s.distinct_id, cs.distinct_id, p.paid_identity) AS distinct_id,
    s.scaffolded_at,
    s.scaffold_deploy_target,
    c.commercial_triggered_at,
    c.role,
    c.team_size,
    c.referral_source,
    cs.checkout_started_at,
    COALESCE(cs.checkout_session_id, p.paid_checkout_session_id) AS checkout_session_id,
    p.paid_at,
    p.paid_amount_cents,
    p.paid_currency
  FROM startup_commercial c
  FULL OUTER JOIN scaffolded s
    ON s.distinct_id = c.distinct_id
  FULL OUTER JOIN checkout_started cs
    ON cs.distinct_id = COALESCE(c.distinct_id, s.distinct_id)
  FULL OUTER JOIN startup_paid p
    ON p.paid_identity = COALESCE(c.distinct_id, s.distinct_id, cs.distinct_id)
       OR p.paid_checkout_session_id = cs.checkout_session_id
)
SELECT
  tr.distinct_id,
  tr.team_size,
  tr.role,
  tr.referral_source,
  tr.scaffolded_at,
  tr.scaffold_deploy_target,
  tr.commercial_triggered_at,
  tr.checkout_started_at,
  tr.checkout_session_id,
  tr.paid_at,
  tr.paid_amount_cents,
  tr.paid_currency,
  CASE
    WHEN tr.commercial_triggered_at IS NOT NULL
      AND tr.paid_at >= tr.commercial_triggered_at
      AND tr.paid_at <= tr.commercial_triggered_at + INTERVAL '30 days'
    THEN true
    ELSE false
  END AS paid_within_30d,
  vd.deploy_events_30d,
  vd.deployed_apps_30d,
  vd.latest_deploy_verified_at,
  COUNT(*) FILTER (WHERE tr.commercial_triggered_at IS NOT NULL) OVER () AS startup_team_sample_n,
  COUNT(*) FILTER (
    WHERE tr.commercial_triggered_at IS NOT NULL
      AND tr.paid_at >= tr.commercial_triggered_at
      AND tr.paid_at <= tr.commercial_triggered_at + INTERVAL '30 days'
  ) OVER () AS startup_paid_n,
  ROUND(
    COUNT(*) FILTER (
      WHERE tr.commercial_triggered_at IS NOT NULL
        AND tr.paid_at >= tr.commercial_triggered_at
        AND tr.paid_at <= tr.commercial_triggered_at + INTERVAL '30 days'
    ) OVER ()::numeric
    / NULLIF(COUNT(*) FILTER (WHERE tr.commercial_triggered_at IS NOT NULL) OVER (), 0)
    * 100,
    2
  ) AS startup_paid_pct
FROM team_rows tr
CROSS JOIN verified_deployments vd
WHERE tr.commercial_triggered_at IS NOT NULL
ORDER BY tr.commercial_triggered_at DESC
LIMIT 200;
