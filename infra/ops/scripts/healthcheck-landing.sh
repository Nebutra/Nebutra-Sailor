#!/usr/bin/env bash
# Probe landing-page on the ECS box. Designed to run as a systemd timer
# every minute. If the probe fails 3 times in a row, restart PM2; if that
# doesn't fix it within 5 minutes, escalate (log + optionally webhook).
#
# Install:
#   sudo cp infra/ops/scripts/healthcheck-landing.sh /usr/local/bin/
#   sudo chmod +x /usr/local/bin/healthcheck-landing.sh
#   sudo cp infra/ops/scripts/healthcheck-landing.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now healthcheck-landing.timer
#
# Tail logs:
#   journalctl -u healthcheck-landing.service -f

set -uo pipefail

PORT="${LANDING_PORT:-3001}"
URL="http://127.0.0.1:${PORT}/"
STATE_DIR="/var/lib/landing-healthcheck"
FAIL_FILE="${STATE_DIR}/consecutive_failures"
RESTART_FILE="${STATE_DIR}/last_restart"
MAX_FAILURES_BEFORE_RESTART=3
MIN_SECONDS_BETWEEN_RESTARTS=300   # don't restart-storm

mkdir -p "$STATE_DIR"

# Probe: any 2xx/3xx response within 5 s counts as healthy.
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")

if [[ "$http_code" =~ ^[23] ]]; then
  echo "$(date -Is) OK status=$http_code"
  echo 0 > "$FAIL_FILE"
  exit 0
fi

# Failed.
fails=$(cat "$FAIL_FILE" 2>/dev/null || echo 0)
fails=$((fails + 1))
echo "$fails" > "$FAIL_FILE"
echo "$(date -Is) FAIL status=$http_code consecutive=$fails"

if (( fails >= MAX_FAILURES_BEFORE_RESTART )); then
  now=$(date +%s)
  last=$(cat "$RESTART_FILE" 2>/dev/null || echo 0)
  delta=$((now - last))

  if (( delta < MIN_SECONDS_BETWEEN_RESTARTS )); then
    echo "$(date -Is) HOLD restart skipped (last=${delta}s ago, threshold=${MIN_SECONDS_BETWEEN_RESTARTS}s) — escalating"
    # Hook for future webhook / Aliyun SMS / Slack here.
    exit 2
  fi

  echo "$(date -Is) ACTION pm2 restart landing-page"
  pm2 restart landing-page --update-env >&2 || pm2 start /opt/nebutra/ecosystem.config.cjs --only landing-page >&2
  echo 0 > "$FAIL_FILE"
  echo "$now" > "$RESTART_FILE"
fi

exit 1
