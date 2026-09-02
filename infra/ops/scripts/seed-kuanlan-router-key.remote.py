#!/usr/bin/env python3
"""Issue a New-API user token and write it to kuanlan ROUTER_API_KEY.

New-API v0.8 login puts the admin session in cookies and leaves
access_token null. Keep a cookie jar, then mint the consume key.
Compatible with the Cloud VM's system Python 3.6.
"""

import glob
import http.cookiejar
import json
import os
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request

base, root = sys.argv[1:3]
password = os.environ.get("NEW_API_ROOT_PASSWORD", "")
channel_key = os.environ.get("CHANNEL_302_KEY", "")
admin_token = os.environ.get("NEW_API_ACCESS_TOKEN", "")
reset_password = ""
reset_hash = ""
secrets_path = "/tmp/seed-kuanlan-secrets.json"
if os.path.exists(secrets_path):
    with open(secrets_path) as handle:
        secrets = json.load(handle)
    os.remove(secrets_path)
    channel_key = secrets.get("CHANNEL_302_KEY") or channel_key
    admin_token = secrets.get("NEW_API_ACCESS_TOKEN") or admin_token
    reset_password = secrets.get("ROOT_PASSWORD") or ""
    reset_hash = secrets.get("ROOT_PASSWORD_HASH") or ""

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


def find_new_api_db():
    matches = glob.glob(root + "/new-api/data/*.db")
    if not matches:
        return None
    matches.sort(key=lambda path: (0 if path.endswith("one-api.db") else 1, path))
    return matches[0]


def reset_root_password(hash_value, plaintext):
    db_path = find_new_api_db()
    if not db_path:
        print("no New-API sqlite db under new-api/data")
        return False
    conn = sqlite3.connect(db_path)
    try:
        rows = list(conn.execute("SELECT id, username, role, status FROM users"))
        print("new-api users: %s" % ",".join("%s(role=%s,status=%s)" % (row[1], row[2], row[3]) for row in rows))
        conn.execute("UPDATE users SET password = ?, status = 1", (hash_value,))
        conn.commit()
        if conn.total_changes < 1:
            print("sqlite users update matched 0 rows in %s" % db_path)
            return False
    finally:
        conn.close()
    password_file = root + "/new-api/root.password"
    fd = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(plaintext + "\n")
    print("reset New-API root password in sqlite")
    try:
        subprocess.check_call(
            ["docker", "restart", "nebutra-new-api-new-api-1"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )
    except (OSError, subprocess.CalledProcessError):
        print("docker restart skipped")
        return True
    for _ in range(24):
        try:
            req("GET", "/api/status")
            print("new-api ready after password reset")
            return True
        except Exception:
            time.sleep(2)
    print("new-api did not come back after restart")
    return True


session_ok = False
if admin_token:
    session_ok = True


def try_admin_login(usernames, candidates):
    global session_ok, admin_token
    for username in usernames:
        for candidate in candidates:
            if not candidate:
                continue
            payload = req("POST", "/api/user/login", {"username": username, "password": candidate})
            if not ok(payload):
                print("admin /api/user/login %s: %s" % (
                    username,
                    payload.get("message") or payload.get("_message") or "rejected",
                ))
                continue
            session_ok = True
            admin_token = extract_token(payload) or admin_token
            print("admin session via %s (cookie=%s token=%s)" % (
                username,
                "yes" if list(jar) else "no",
                "yes" if admin_token else "no",
            ))
            return


if not session_ok:
    try_admin_login(["root"], [password, "123456"])

if not session_ok and reset_password and reset_hash:
    if reset_root_password(reset_hash, reset_password):
        usernames = ["root"]
        db_path = find_new_api_db()
        if db_path:
            conn = sqlite3.connect(db_path)
            try:
                usernames = [row[0] for row in conn.execute("SELECT username FROM users")] or usernames
            finally:
                conn.close()
        try_admin_login(usernames, [reset_password])

if session_ok and not admin_token:
    payload = req("GET", "/api/user/token", token=admin_token)
    admin_token = extract_token(payload)
    if admin_token:
        print("generated New-API admin PAT")
    else:
        print("admin PAT skipped: %s" % (payload.get("message") or payload.get("_message") or "empty"))

def sqlite_issue_token():
    db_path = find_new_api_db()
    if not db_path:
        return ""
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            "SELECT key FROM tokens WHERE status = 1 ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if row and row[0]:
            key = row[0]
            print("reused existing New-API token from sqlite")
        else:
            key = os.urandom(24).hex()
            user_row = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
            user_id = user_row[0] if user_row else 1
            now = int(time.time())
            conn.execute(
                "INSERT INTO tokens (user_id, key, status, name, created_time, accessed_time, expired_time, remain_quota, unlimited_quota, used_quota) "
                "VALUES (?, ?, 1, 'kuanlan', ?, ?, -1, 0, 1, 0)",
                (user_id, key, now, now),
            )
            conn.commit()
            print("inserted New-API consume token in sqlite")
        if channel_key:
            try:
                existing = conn.execute(
                    "SELECT id FROM channels WHERE name = '302-image2' OR models LIKE '%gpt-image-2%'"
                ).fetchone()
                if existing:
                    conn.execute(
                        "UPDATE channels SET key = ?, base_url = ?, models = ?, status = 1, type = 1 WHERE id = ?",
                        (channel_key, "https://api.302.ai", "gpt-image-2", existing[0]),
                    )
                    channel_id = existing[0]
                else:
                    now = int(time.time())
                    cur = conn.execute(
                        "INSERT INTO channels (type, key, status, name, created_time, models, \"group\") "
                        "VALUES (1, ?, 1, '302-image2', ?, 'gpt-image-2', 'default')",
                        (channel_key, now),
                    )
                    channel_id = cur.lastrowid
                ability = conn.execute(
                    "SELECT 1 FROM abilities WHERE channel_id = ? AND model = 'gpt-image-2'",
                    (channel_id,),
                ).fetchone()
                if not ability:
                    conn.execute(
                        "INSERT INTO abilities (\"group\", model, channel_id, enabled, priority) "
                        "VALUES ('default', 'gpt-image-2', ?, 1, 0)",
                        (channel_id,),
                    )
                conn.commit()
                print("ensured 302-image2 channel in sqlite")
            except sqlite3.Error as error:
                print("channel seed skipped: %s" % error)
        if key.startswith("sk-"):
            return key
        return "sk-" + key
    finally:
        conn.close()


if not session_ok and not admin_token:
    user_token = sqlite_issue_token()
    if user_token:
        env_path = root + "/kuanlan/.env"
        replace_env(env_path, "ROUTER_API_KEY", user_token)
        replace_env(env_path, "IMAGE2_BASE_URL", "http://127.0.0.1:3301/v1")
        replace_env(env_path, "IMAGE2_MODEL", "gpt-image-2")
        print("issued consume key prefix=%s… → kuanlan ROUTER_API_KEY" % user_token[:7])
        raise SystemExit(0)
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
