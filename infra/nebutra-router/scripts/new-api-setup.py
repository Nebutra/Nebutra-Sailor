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
print("login ok, root id =", (login.get("data") or {}).get("id"))
