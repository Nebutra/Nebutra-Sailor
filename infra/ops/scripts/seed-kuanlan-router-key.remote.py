#!/usr/bin/env python3
"""Issue a New-API user token and write it to kuanlan ROUTER_API_KEY.

The 302.ai channel key stays inside New-API. This process never prints tokens.
"""

from __future__ import annotations

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
    with open(secrets_path, encoding="utf-8") as handle:
        secrets = json.load(handle)
    os.remove(secrets_path)
    channel_key = secrets.get("CHANNEL_302_KEY") or channel_key
    admin_token = secrets.get("NEW_API_ACCESS_TOKEN") or admin_token


def req(method: str, path: str, body=None, token: str | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["New-Api-User"] = "1"
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read().decode()
        return json.loads(raw) if raw else {}


def ok(payload) -> bool:
    return bool(payload) and payload.get("success", True) is not False


def extract_token(payload) -> str:
    data = payload.get("data") or {}
    if isinstance(data, str):
        return data
    return (
        data.get("access_token")
        or data.get("token")
        or data.get("key")
        or payload.get("token")
        or payload.get("key")
        or ""
    )


def replace_env(path: str, key: str, value: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with open(path, encoding="utf-8") as handle:
            lines = handle.readlines()
    except FileNotFoundError:
        lines = []
    written = False
    out = []
    prefix = f"{key}="
    for line in lines:
        if line.startswith(prefix):
            out.append(f"{prefix}{value}\n")
            written = True
        else:
            out.append(line)
    if not written:
        if out and not out[-1].endswith("\n"):
            out[-1] += "\n"
        out.append(f"{prefix}{value}\n")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.writelines(out)


if not admin_token:
    candidates = [password] if password else []
    if "123456" not in candidates:
        candidates.append("123456")
    for candidate in candidates:
        for path, body in (
            ("/api/user/login", {"username": "root", "password": candidate}),
            ("/api/user/register", {"username": "root", "password": candidate}),
            ("/api/setup", {"username": "root", "password": candidate}),
        ):
            try:
                payload = req("POST", path, body)
            except urllib.error.HTTPError:
                continue
            if not ok(payload):
                continue
            admin_token = extract_token(payload)
            if admin_token:
                if candidate != password:
                    print("used New-API default root password — rotate after issue", flush=True)
                break
        if admin_token:
            break

if not admin_token:
    raise SystemExit("no New-API admin token — cannot issue a consume key")

if channel_key:
    try:
        req(
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
            admin_token,
        )
        print("ensured New-API channel 302-image2", flush=True)
    except urllib.error.HTTPError as error:
        print(f"channel seed skipped ({error.code})", flush=True)

token_payload = req(
    "POST",
    "/api/token/",
    {"name": "kuanlan", "remain_quota": -1, "unlimited_quota": True},
    admin_token,
)
user_token = extract_token(token_payload)
if not user_token:
    raise SystemExit("New-API did not return a user token")

env_path = f"{root}/kuanlan/.env"
replace_env(env_path, "ROUTER_API_KEY", user_token)
# Same box as New-API. Public router.nebutra.com/v1 is still the Fly UI.
replace_env(env_path, "IMAGE2_BASE_URL", "http://127.0.0.1:3301/v1")
replace_env(env_path, "IMAGE2_MODEL", "gpt-image-2")
print(f"issued consume key prefix={user_token[:7]}… → kuanlan ROUTER_API_KEY", flush=True)
