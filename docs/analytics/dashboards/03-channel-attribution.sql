-- 03: Channel attribution — which referrers / UTMs convert best?
-- ------------------------------------------------------------------
-- Question: Which utm_source × utm_medium pairs push users all the
--           way from scaffold to activated CLI license?
-- Window:   Last 30 days
-- Source:   analytics_events (PostHog replay)
-- Noise:    source/medium groups with <=5 scaffolders are filtered.
-- ------------------------------------------------------------------

SELECT
  properties->>'utm_source' AS source,
  properties->>'utm_medium' AS medium,

  COUNT(DISTINCT distinct_id) FILTER (
    WHERE event = 'scaffold.completed'
  ) AS scaffolded_users,

  COUNT(DISTINCT distinct_id) FILTER (
    WHERE event = 'license.cli'
      AND properties->>'action' = 'activated'
  ) AS activated_users,

  ROUND(
    COUNT(DISTINCT distinct_id) FILTER (
      WHERE event = 'license.cli'
        AND properties->>'action' = 'activated'
    )::numeric
    / NULLIF(
        COUNT(DISTINCT distinct_id) FILTER (
          WHERE event = 'scaffold.completed'
        ),
        0
      )
    * 100,
    2
  ) AS conversion_pct

FROM analytics_events
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND (properties ? 'utm_source' OR properties ? 'utm_medium')
GROUP BY properties->>'utm_source', properties->>'utm_medium'
HAVING COUNT(DISTINCT distinct_id) FILTER (
         WHERE event = 'scaffold.completed'
       ) > 5
ORDER BY conversion_pct DESC NULLS LAST;
