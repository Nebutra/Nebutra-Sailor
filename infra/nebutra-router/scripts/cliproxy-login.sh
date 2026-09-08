#!/usr/bin/env bash
# Add an OAuth / CLI account to the CLIProxyAPI sidecar without a browser on
# the server. Runs the login flag inside the running container so the auth
# JSON lands on the cliproxy_auths volume and survives restarts.
#
#   scripts/cliproxy-login.sh codex        # ChatGPT / Codex — device code, fully headless
#   scripts/cliproxy-login.sh gemini       # Google via Antigravity — prints a URL, paste the callback URL back
#   scripts/cliproxy-login.sh claude       # Claude Code — same paste-back flow
#   scripts/cliproxy-login.sh kimi | xai
#
# Fly:   FLY_APP=nebutra-cliproxyapi scripts/cliproxy-login.sh codex
# Local: scripts/cliproxy-login.sh codex   (docker compose service "cliproxyapi")
#
# Paste-back flow (Google / Claude): the login prints
#   https://accounts.google.com/o/oauth2/v2/auth?...redirect_uri=http://localhost:51121/oauth-callback...
# Open it on your laptop, approve, and the browser lands on
#   http://localhost:51121/oauth-callback?state=...&code=...
# which fails to load (nothing listens on your laptop). Copy that whole URL from
# the address bar and paste it into this terminal. The code is single-use and
# expires within minutes.
set -euo pipefail

provider="${1:-}"
case "$provider" in
  codex)  flags="-codex-device-login" ;;
  gemini|antigravity|google) flags="-antigravity-login -no-browser" ;;
  claude) flags="-claude-login -no-browser" ;;
  kimi)   flags="-kimi-login -no-browser" ;;
  xai)    flags="-xai-login -no-browser" ;;
  *)
    echo "usage: $0 codex|gemini|claude|kimi|xai" >&2
    exit 2
    ;;
esac

cmd="/CLIProxyAPI/CLIProxyAPI -config /CLIProxyAPI/config.yaml $flags"

if [ -n "${FLY_APP:-}" ]; then
  exec flyctl ssh console -a "$FLY_APP" -C "$cmd"
fi

service="${COMPOSE_SERVICE:-cliproxyapi}"
exec docker compose exec -it "$service" sh -c "$cmd"
