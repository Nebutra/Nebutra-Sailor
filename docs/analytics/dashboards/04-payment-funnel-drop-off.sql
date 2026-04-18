-- 04: Payment funnel drop-off by provider
-- ------------------------------------------------------------------
-- Question: For each payment method (WeChat / Alipay / Stripe /
--           Lemon Squeezy), what share of checkouts go from started
--           to completed, and which has the worst abandonment?
-- Window:   Last 30 days
-- Source:   analytics_events (PostHog replay)
-- Assumes:  event = 'checkout' with properties.payment_method and
--           properties.action ∈ {started, completed, abandoned}.
-- ------------------------------------------------------------------

SELECT
  properties->>'payment_method' AS method,

  COUNT(*) FILTER (WHERE properties->>'action' = 'started')   AS started,
  COUNT(*) FILTER (WHERE properties->>'action' = 'completed') AS completed,
  COUNT(*) FILTER (WHERE properties->>'action' = 'abandoned') AS abandoned,

  ROUND(
    COUNT(*) FILTER (WHERE properties->>'action' = 'completed')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE properties->>'action' = 'started'), 0)
    * 100,
    2
  ) AS completion_pct

FROM analytics_events
WHERE event = 'checkout'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties->>'payment_method'
ORDER BY started DESC;
