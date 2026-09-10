#!/usr/bin/env bash
# Mint an R2 Object Read & Write token for the nebutra-uploads bucket (plus
# nebutra-assets, so catalog seed stays possible) and stage it onto a Fly app.
# Never prints the secret.
#
# The shared GitHub R2_* secret is the *assets seeder*: it is AccessDenied on
# nebutra-uploads. Any app that reads or writes uploads needs its own key from
# here, and its deploy workflow must not overwrite it with the shared one.
#
# Callers are thin wrappers, one per app, so the app's identity lives in a file
# rather than in whoever remembers to export the right variable:
#   provision-kuanlan-r2-uploads-token.sh   Moments — List/Get
#   provision-origin-r2-uploads-token.sh    python-ai origin — List/Get/Put
#
# Inputs:
#   FLY_APP               required — Fly app to stage the key onto
#   R2_TOKEN_NAME         optional — Cloudflare token name (default: $FLY_APP-uploads)
#   R2_VERIFY_PUT         optional — "1" to also verify PutObject/DeleteObject
#   R2_GH_SECRET_PREFIX   optional — e.g. R2_KUANLAN, to also record GitHub secrets
#
# Prerequisites:
#   CLOUDFLARE_API_TOKEN  — User/Account API Tokens Edit (Create additional tokens)
#   FLY_API_TOKEN         — deploy-scoped, can secrets set $FLY_APP
set -euo pipefail

TOKEN="${CLOUDFLARE_API_TOKEN:-${CLOUDFLARE_WORKERS_API_TOKEN:-}}"
export ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-a4248a5738df319996a70092fe598d37}"
FLY_APP="${FLY_APP:?set FLY_APP (call a per-app wrapper, not this script)}"
TOKEN_NAME="${R2_TOKEN_NAME:-${FLY_APP}-uploads}"
VERIFY_PUT="${R2_VERIFY_PUT:-0}"
GH_SECRET_PREFIX="${R2_GH_SECRET_PREFIX:-}"

# Workers R2 Storage Bucket Item Write — read, write, and list objects.
BUCKET_ITEM_WRITE="2efd5506f9c8494dacb1fa10a3e7d5b6"
# Workers R2 Storage Write — account-wide fallback if bucket policies are rejected.
ACCOUNT_R2_WRITE="bf7481a1826f439697cb59a20b22293e"

if [ -z "$TOKEN" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (must be able to create API tokens)" >&2
  exit 1
fi
if [ -z "${FLY_API_TOKEN:-}" ]; then
  echo "Set FLY_API_TOKEN so the new key can be restaged onto ${FLY_APP}" >&2
  exit 1
fi

uploads="com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_nebutra-uploads"
assets="com.cloudflare.edge.r2.bucket.${ACCOUNT_ID}_default_nebutra-assets"

cf() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

payload_bucket() {
  python3 - <<PY
import json
print(json.dumps({
  "name": "${TOKEN_NAME}",
  "policies": [{
    "effect": "allow",
    "resources": {
      "${uploads}": "*",
      "${assets}": "*",
    },
    "permission_groups": [{"id": "${BUCKET_ITEM_WRITE}"}],
  }],
}))
PY
}

payload_account() {
  python3 - <<PY
import json
print(json.dumps({
  "name": "${TOKEN_NAME}",
  "policies": [{
    "effect": "allow",
    "resources": {"com.cloudflare.api.account.${ACCOUNT_ID}": "*"},
    "permission_groups": [{"id": "${ACCOUNT_R2_WRITE}"}],
  }],
}))
PY
}

create_one() {
  local path="$1"
  local body="$2"
  local tmp
  tmp="$(mktemp)"
  # Body stays in a file so curl -d never lands the token JSON on a shell history line.
  printf '%s' "$body" > "$tmp"
  cf POST "$path" --data @"$tmp"
  rm -f "$tmp"
}

ok() {
  python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1], encoding="utf-8")).get("success") else 1)' "$1"
}

show_errors() {
  python3 -c 'import json,sys; d=json.load(open(sys.argv[2], encoding="utf-8")); print(sys.argv[1]+":", d.get("errors") or d.get("messages"))' "$1" "$2"
}

extract_keys() {
  python3 - "$1" "$2" <<'PY'
import hashlib, json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
if not d.get("success"):
    print("create failed:", d.get("errors") or d.get("messages"), file=sys.stderr)
    sys.exit(3)
r = d["result"]
token_id = r.get("id") or ""
value = r.get("value") or ""
if not token_id or not value:
    print("create returned no id/value", file=sys.stderr)
    sys.exit(4)
secret = hashlib.sha256(value.encode("utf-8")).hexdigest()
with open(sys.argv[2], "w", encoding="utf-8") as fh:
    fh.write(f"export ACCESS_KEY_ID={token_id!r}\n")
    fh.write(f"export SECRET_ACCESS_KEY={secret!r}\n")
    fh.write(f"export TOKEN_ID_LEN={len(token_id)}\n")
    fh.write(f"export SECRET_LEN={len(secret)}\n")
PY
}

echo "=== create R2 object token ${TOKEN_NAME} ==="
RESULT_FILE="$(mktemp)"
KEYS_FILE="$(mktemp)"
chmod 600 "$RESULT_FILE" "$KEYS_FILE"
trap 'rm -f "$RESULT_FILE" "$KEYS_FILE"' EXIT

create_one "/user/tokens" "$(payload_bucket)" > "$RESULT_FILE"
ROUTE="user/bucket"

if ! ok "$RESULT_FILE"; then
  echo "user+bucket failed; trying account-owned token" >&2
  show_errors "user+bucket" "$RESULT_FILE"
  create_one "/accounts/${ACCOUNT_ID}/tokens" "$(payload_bucket)" > "$RESULT_FILE"
  ROUTE="account/bucket"
fi

if ! ok "$RESULT_FILE"; then
  echo "bucket policy failed; trying account-wide R2 Write" >&2
  show_errors "account+bucket" "$RESULT_FILE"
  create_one "/accounts/${ACCOUNT_ID}/tokens" "$(payload_account)" > "$RESULT_FILE"
  ROUTE="account/r2-write"
fi

if ! ok "$RESULT_FILE"; then
  echo "account-wide failed; last try user + account R2 Write" >&2
  show_errors "account+r2-write" "$RESULT_FILE"
  create_one "/user/tokens" "$(payload_account)" > "$RESULT_FILE"
  ROUTE="user/r2-write"
fi

extract_keys "$RESULT_FILE" "$KEYS_FILE"
# Drop the Cloudflare token value before anything else reads the shell env.
rm -f "$RESULT_FILE"
# shellcheck disable=SC1090
source "$KEYS_FILE"
rm -f "$KEYS_FILE"

echo "created via ${ROUTE} id_len=${TOKEN_ID_LEN} secret_len=${SECRET_LEN}"

echo "=== restage onto Fly ${FLY_APP} ==="
# Apply immediately so the running Machine picks up List on uploads.
# deploy-fly.yml must not overwrite these with the assets-only GitHub R2_*.
flyctl secrets set \
  R2_ACCESS_KEY_ID="$ACCESS_KEY_ID" \
  R2_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY" \
  CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" \
  -a "$FLY_APP"

# Recording the pair as GitHub secrets is best-effort and usually FAILS: the
# default Actions GITHUB_TOKEN cannot write repository secrets. Fly already has
# the key by this point, so a failure here is not fatal — but it does mean the
# app's deploy workflow must skip the shared R2_* rather than rely on a
# per-app GitHub secret that may never have been created.
if [ -n "$GH_SECRET_PREFIX" ] && command -v gh >/dev/null 2>&1 && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  echo "=== record ${GH_SECRET_PREFIX}_* GitHub secrets (best effort) ==="
  if printf '%s' "$ACCESS_KEY_ID" | gh secret set "${GH_SECRET_PREFIX}_ACCESS_KEY_ID" -R "$GITHUB_REPOSITORY" \
    && printf '%s' "$SECRET_ACCESS_KEY" | gh secret set "${GH_SECRET_PREFIX}_SECRET_ACCESS_KEY" -R "$GITHUB_REPOSITORY"; then
    echo "GitHub ${GH_SECRET_PREFIX}_* updated"
  else
    echo "::warning::GitHub secret write failed (token cannot write Actions secrets). Fly has the key; the deploy must not overwrite it." >&2
  fi
fi

echo "=== verify against nebutra-uploads (list, and put/delete when asked) ==="
VERIFY_PUT="$VERIFY_PUT" python3 - <<'VERIFY'
"""Prove the minted key can do what the app needs, with SigV4 signed by hand.

A token that lists but cannot put looks healthy to a read-only probe and then
fails on the first upload in production. That is exactly how the origin shipped
broken, so when R2_VERIFY_PUT=1 this puts a throwaway object and deletes it.
"""
import datetime, hashlib, hmac, os, sys, urllib.error, urllib.request

access = os.environ["ACCESS_KEY_ID"]
secret = os.environ["SECRET_ACCESS_KEY"]
account = os.environ["ACCOUNT_ID"]
verify_put = os.environ.get("VERIFY_PUT") == "1"
bucket = "nebutra-uploads"
region, service = "auto", "s3"
host = f"{account}.r2.cloudflarestorage.com"


def sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def call(method: str, path: str, query: str = "", body: bytes = b"") -> int:
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(body).hexdigest()
    canonical_headers = (
        f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    )
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(
        [method, path, query, canonical_headers, signed_headers, payload_hash]
    )
    scope = f"{datestamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            scope,
            hashlib.sha256(canonical_request.encode()).hexdigest(),
        ]
    )
    signing_key = sign(
        sign(sign(sign(("AWS4" + secret).encode(), datestamp), region), service),
        "aws4_request",
    )
    signature = hmac.new(signing_key, string_to_sign.encode(), hashlib.sha256).hexdigest()
    url = f"https://{host}{path}" + (f"?{query}" if query else "")
    req = urllib.request.Request(
        url,
        data=body or None,
        headers={
            "x-amz-date": amz_date,
            "x-amz-content-sha256": payload_hash,
            "Authorization": (
                f"AWS4-HMAC-SHA256 Credential={access}/{scope}, "
                f"SignedHeaders={signed_headers}, Signature={signature}"
            ),
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        resp.read()
        return resp.status


def step(label: str, method: str, path: str, query: str = "", body: bytes = b"") -> None:
    try:
        print(f"{label}_ok status={call(method, path, query, body)}")
    except urllib.error.HTTPError as exc:
        print(f"::error::{label} failed status={exc.code} - the token lacks that permission")
        sys.exit(5)


step("list", "GET", f"/{bucket}", "list-type=2&max-keys=1")

if verify_put:
    key = f"_provision-probe/{datetime.datetime.now(datetime.timezone.utc):%Y%m%dT%H%M%SZ}.txt"
    step("put", "PUT", f"/{bucket}/{key}", body=b"provision probe\n")
    step("delete", "DELETE", f"/{bucket}/{key}")
VERIFY

echo "done. ${FLY_APP} has an uploads key. Rotate in the dashboard if this run is retried."
