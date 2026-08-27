-- 06: Sleptons community engagement leaderboard
-- ------------------------------------------------------------------
-- Question: Who are the most engaged community members over the last
--           30 days? Ranked by weighted activity score.
-- Window:   Last 30 days
-- Source:   analytics_events (PostHog replay)
-- Weights:  showcase_posted * 5  (highest signal — creating content)
--           connection_made  * 3  (relationship formed)
--           ideas_voted      * 2  (lightweight engagement)
--           profile_viewed   * 1  (pure browsing)
-- ------------------------------------------------------------------

SELECT
  properties->>'userId' AS user_id,

  COUNT(*) FILTER (WHERE properties->>'action' = 'profile_viewed')  AS profiles_viewed,
  COUNT(*) FILTER (WHERE properties->>'action' = 'showcase_posted') AS showcases_posted,
  COUNT(*) FILTER (WHERE properties->>'action' = 'ideas_voted')     AS votes_cast,
  COUNT(*) FILTER (WHERE properties->>'action' = 'connection_made') AS connections,

  MAX(timestamp) AS last_active
FROM analytics_events
WHERE event = 'sleptons'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY properties->>'userId'
ORDER BY
  (
    COUNT(*) FILTER (WHERE properties->>'action' = 'profile_viewed')
    + COUNT(*) FILTER (WHERE properties->>'action' = 'showcase_posted') * 5
    + COUNT(*) FILTER (WHERE properties->>'action' = 'ideas_voted')     * 2
    + COUNT(*) FILTER (WHERE properties->>'action' = 'connection_made') * 3
  ) DESC
LIMIT 50;
