-- 05: Docs pain map — top searches that return zero results
-- ------------------------------------------------------------------
-- Question: Which documentation queries are users typing that our
--           docs cannot answer? These are the next content gaps.
-- Window:   Last 14 days
-- Source:   analytics_events (PostHog replay)
-- Assumes:  event = 'docs.search_query' with properties.query and
--           properties.result_count (integer).
-- Filter:   searches with avg result_count < 1, OR searches that
--           fire more than 10 times regardless of hit count
--           (popular-but-weak queries are still worth surfacing).
-- ------------------------------------------------------------------

SELECT
  properties->>'query' AS search_query,
  COUNT(*)             AS search_count,
  ROUND(AVG((properties->>'result_count')::int), 1) AS avg_results
FROM analytics_events
WHERE event = 'docs.search_query'
  AND timestamp >= NOW() - INTERVAL '14 days'
GROUP BY properties->>'query'
HAVING AVG((properties->>'result_count')::int) < 1
    OR COUNT(*) > 10
ORDER BY search_count DESC
LIMIT 20;
