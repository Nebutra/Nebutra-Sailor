#!/usr/bin/env python3
"""Issue a New-API user token and write it to kuanlan ROUTER_API_KEY.

New-API v0.8 login puts the admin session in cookies and leaves
access_token null. Keep a cookie jar, then mint the consume key.
Compatible with the Cloud VM's system Python 3.6.
"""

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request

base, root = sys.argv[1:3]
password = os.environ.get("NEW_API_ROOT_PASSWORD", "")
channel_key = os.environ.get("CHANNEL_302_KEY", "")
admin_token = os.environ.get("NEW_API_ACCESS_TOKEN", "")
secrets_path = "/tmp/seed-kuanlan-secrets.json"
if os.path.exists(secrets_path):
    with open(secrets_path) as handle:
        secrets = json.load(handle)
    os.remove(secrets_path)
    channel_key = secrets.get("CHANNEL_302_KEY") or channel_key
    admin_token = secrets.get("NEW_API_ACCESS_TOKEN") or admin_token

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def req(method, path, body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
        headers["New-Api-User"] = "1"
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
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
        payload["_message"] = payload.get("message") or raw[:120]
        return payload


def ok(payload):
    return bool(payload) and payload.get("success", True) is not False and "_http" not in payload


def extract_token(payload):
    data = payload.get("data")
    if isinstance(data, str) and data:
        return data
    if not isinstance(data, dict):
        data = {}
    for key in ("access_token", "token", "key"):
        value = data.get(key)
        if value:
            return value
    for key in ("token", "key"):
        value = payload.get(key)
        if value:
            return value
    return ""


def replace_env(path, key, value):
    dirname = os.path.dirname(path)
    if dirname and not os.path.isdir(dirname):
        os.makedirs(dirname)
    try:
        with open(path) as handle:
            lines = handle.readlines()
    except IOError:
        lines = []
    written = False
    out = []
    prefix = key + "="
    for line in lines:
        if line.startswith(prefix):
            out.append(prefix + value + "\n")
            written = True
        else:
            out.append(line)
    if not written:
        if out and not out[-1].endswith("\n"):
            out[-1] += "\n"
        out.append(prefix + value + "\n")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.writelines(out)


session_ok = False
if admin_token:
    session_ok = True

if not session_ok:
    candidates = []
    if password:
        candidates.append(password)
    if "123456" not in candidates:
        candidates.append("123456")
    for candidate in candidates:
        for path, body in (
            ("/api/user/login", {"username": "root", "password": candidate}),
            ("/api/user/register", {"username": "root", "password": candidate}),
            ("/api/setup", {"username": "root", "password": candidate}),
        ):
            payload = req("POST", path, body)
            if not ok(payload):
                message = payload.get("message") or payload.get("_message") or "rejected"
                print("admin %s: %s" % (path, message))
                continue
            session_ok = True
            admin_token = extract_token(payload) or admin_token
            if candidate != password:
                print("used New-API default root password — rotate after issue")
            print("admin session via %s (cookie=%s token=%s)" % (
                path,
                "yes" if list(jar) else "no",
                "yes" if admin_token else "no",
            ))
            break
        if session_ok:
            break

if session_ok and not admin_token:
    payload = req("GET", "/api/user/token", token=admin_token)
    admin_token = extract_token(payload)
    if admin_token:
        print("generated New-API admin PAT")
    else:
        print("admin PAT skipped: %s" % (payload.get("message") or payload.get("_message") or "empty"))

if not session_ok and not admin_token:
    raise SystemExit("no New-API admin session — cannot issue a consume key")

if channel_key:
    payload = req(
        "POST",
        "/api/channel/",
        {
            "type": 1,
            "name": "302-image2",
            "key": channel_key,
            "base_url": "https://api.302.ai",
            "models": "gpt-image-2",
            "group": "default",
            "status": 1,
        },
        admin_token or None,
    )
    if ok(payload):
        print("ensured New-API channel 302-image2")
    else:
        print("channel seed skipped (%s)" % (payload.get("message") or payload.get("_http") or "rejected"))

token_payload = req(
    "POST",
    "/api/token/",
    {"name": "kuanlan", "remain_quota": -1, "unlimited_quota": True},
    admin_token or None,
)
user_token = extract_token(token_payload)
if not user_token:
    raise SystemExit(
        "New-API did not return a user token (%s)"
        % (token_payload.get("message") or token_payload.get("_message") or "empty")
    )

env_path = root + "/kuanlan/.env"
replace_env(env_path, "ROUTER_API_KEY", user_token)
# Same box as New-API. Public router.nebutra.com/v1 is still the Fly UI.
replace_env(env_path, "IMAGE2_BASE_URL", "http://127.0.0.1:3301/v1")
replace_env(env_path, "IMAGE2_MODEL", "gpt-image-2")
print("issued consume key prefix=%s… → kuanlan ROUTER_API_KEY" % user_token[:7])
