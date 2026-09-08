#!/usr/bin/env python3
"""Run New-API's first-boot setup: create the root user with NEW_API_ROOT_PASSWORD.

Idempotent: exits 0 if root is already initialised (then only verifies login).
Reach a private Machine over flyctl proxy first:

    flyctl proxy 13000:3000 -a nebutra-new-api &
    NEW_API_BASE_URL=http://127.0.0.1:13000 NEW_API_ROOT_PASSWORD=… python3 infra/nebutra-router/scripts/new-api-setup.py
"""

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request

base = os.environ.get("NEW_API_BASE_URL", "http://127.0.0.1:13000").rstrip("/")
if base.endswith("/v1"):
    base = base[:-3]
password = os.environ.get("NEW_API_ROOT_PASSWORD", "")
if not password:
    sys.exit("NEW_API_ROOT_PASSWORD is required")

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def req(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with opener.open(request, timeout=20) as response:
            raw = response.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        return {"success": False, "message": "HTTP %s %s" % (error.code, error.read().decode()[:160])}


status = req("GET", "/api/setup")
root_init = bool((status.get("data") or {}).get("root_init"))
if not root_init:
    result = req(
        "POST",
        "/api/setup",
        {
            "username": "root",
            "password": password,
            "confirmPassword": password,
            "SelfUseModeEnabled": True,
            "DemoSiteEnabled": False,
        },
    )
    if result.get("success") is False:
        sys.exit("setup failed: %s" % result.get("message"))
    print("root user created via /api/setup")
else:
    print("root already initialised; verifying login")

login = req("POST", "/api/user/login", {"username": "root", "password": password})
if login.get("success") is False:
    sys.exit("login as root failed: %s" % login.get("message"))
root_id = str((login.get("data") or {}).get("id") or 1)
print("login ok, root id =", root_id)

# Mint (or reuse) the internal user token the Router edge uses upstream
# (NEW_API_ACCESS_TOKEN). Never shown to customers.
TOKEN_NAME = os.environ.get("ROUTER_TOKEN_NAME", "router-edge")


def admin(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "New-Api-User": root_id}
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with opener.open(request, timeout=20) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else {}


existing = admin("GET", "/api/token/?p=0&size=100")
items = existing.get("data")
if isinstance(items, dict):
    items = items.get("items") or []
for item in items or []:
    if item.get("name") == TOKEN_NAME and item.get("key"):
        print("NEW_API_ACCESS_TOKEN=sk-%s" % item["key"] if not str(item["key"]).startswith("sk-") else "NEW_API_ACCESS_TOKEN=%s" % item["key"])
        break
else:
    created = admin("POST", "/api/token/", {"name": TOKEN_NAME, "remain_quota": -1, "unlimited_quota": True, "expired_time": -1})
    if created.get("success") is False:
        sys.exit("token create failed: %s" % created.get("message"))
    again = admin("GET", "/api/token/?p=0&size=100")
    items = again.get("data")
    if isinstance(items, dict):
        items = items.get("items") or []
    key = next((i.get("key") for i in items or [] if i.get("name") == TOKEN_NAME), "")
    if not key:
        sys.exit("token created but key not returned; copy it from New-API → Tokens")
    print("NEW_API_ACCESS_TOKEN=%s" % (key if str(key).startswith("sk-") else "sk-" + key))
