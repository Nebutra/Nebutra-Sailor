#!/usr/bin/env python3
"""Register (or refresh) the CLIProxyAPI sidecar as a New-API channel.

Idempotent: finds a channel named CHANNEL_NAME and updates it, else creates it.
Model list comes from CLIProxyAPI's own /v1/models so the New-API shelf (and
therefore router.nebutra.com/v1/models) follows whatever accounts are logged in.

Env:
  NEW_API_BASE_URL        http://127.0.0.1:3001      (admin API host, no /v1)
  NEW_API_ROOT_PASSWORD   admin password            (or NEW_API_ACCESS_TOKEN)
  CLIPROXY_BASE_URL       http://cliproxyapi:8317   (as New-API sees it)
  CLIPROXY_API_KEY        the api-keys entry from config/cliproxyapi.yaml
  CLIPROXY_PROBE_URL      optional; where THIS script can reach CLIProxyAPI
                          (defaults to CLIPROXY_BASE_URL)
  CHANNEL_NAME            default "cliproxyapi"
  CHANNEL_PRIORITY        default 0 (New-API picks higher first; keep official keys above)
  CHANNEL_WEIGHT          default 1
"""

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request

base = os.environ.get("NEW_API_BASE_URL", "http://127.0.0.1:3001").rstrip("/")
if base.endswith("/v1"):
    base = base[:-3]
password = os.environ.get("NEW_API_ROOT_PASSWORD", "")
admin_token = os.environ.get("NEW_API_ACCESS_TOKEN", "")
cli_base = os.environ.get("CLIPROXY_BASE_URL", "http://cliproxyapi:8317").rstrip("/")
cli_key = os.environ.get("CLIPROXY_API_KEY", "")
probe = os.environ.get("CLIPROXY_PROBE_URL", cli_base).rstrip("/")
name = os.environ.get("CHANNEL_NAME", "cliproxyapi")
priority = int(os.environ.get("CHANNEL_PRIORITY", "0"))
weight = int(os.environ.get("CHANNEL_WEIGHT", "1"))

if not cli_key:
    sys.exit("CLIPROXY_API_KEY is required")

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def req(method, url, body=None, headers=None):
    data = None if body is None else json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    request = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with opener.open(request, timeout=20) as response:
            raw = response.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode() if error.fp else ""
        try:
            payload = json.loads(raw) if raw else {}
        except ValueError:
            payload = {}
        payload["_http"] = error.code
        return payload


def ok(payload):
    return bool(payload) and payload.get("success", True) is not False and "_http" not in payload


# 1. models CLIProxyAPI currently serves
models_payload = req("GET", probe + "/v1/models", headers={"Authorization": "Bearer " + cli_key})
models = sorted({m.get("id") for m in (models_payload.get("data") or []) if m.get("id")})
if not models:
    sys.exit("CLIProxyAPI returned no models — log an account in first (scripts/cliproxy-login.sh)")
print("cliproxyapi models:", ", ".join(models))

# 2. admin session
admin_headers = {}
if admin_token:
    admin_headers = {"Authorization": "Bearer " + admin_token, "New-Api-User": "1"}
else:
    login = req("POST", base + "/api/user/login", {"username": "root", "password": password})
    if not ok(login):
        sys.exit("New-API admin login failed: %s" % login.get("message", login))
    user_id = str((login.get("data") or {}).get("id") or 1)
    admin_headers = {"New-Api-User": user_id}

# 3. upsert channel
existing = None
page = req("GET", base + "/api/channel/search?keyword=" + name, headers=admin_headers)
items = page.get("data")
if isinstance(items, dict):
    items = items.get("items") or items.get("data") or []
for item in items or []:
    if item.get("name") == name:
        existing = item
        break

body = {
    "type": 1,  # OpenAI-compatible
    "name": name,
    "key": cli_key,
    "base_url": cli_base,
    "models": ",".join(models),
    "group": "default",
    "status": 1,
    "priority": priority,
    "weight": weight,
    "tag": "account-relay",
}

if existing:
    body["id"] = existing["id"]
    result = req("PUT", base + "/api/channel/", body, headers=admin_headers)
    action = "updated"
else:
    result = req("POST", base + "/api/channel/", body, headers=admin_headers)
    action = "created"

if not ok(result):
    sys.exit("channel %s failed: %s" % (action, result.get("message", result)))
print("channel '%s' %s with %d models" % (name, action, len(models)))
