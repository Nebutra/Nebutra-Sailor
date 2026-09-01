#!/usr/bin/env bash
# Print one Fly org slug for non-interactive `fly apps create`.
# Never prints FLY_API_TOKEN. Order: FLY_ORG, flyctl orgs list, GraphQL, personal.
set -euo pipefail

if [ -n "${FLY_ORG:-}" ]; then
  printf '%s\n' "$FLY_ORG"
  exit 0
fi

pick_slug() {
  python3 -c '
import json, sys

def walk(obj, found):
    if isinstance(obj, list):
        for item in obj:
            walk(item, found)
        return
    if not isinstance(obj, dict):
        return
    slug = obj.get("slug") or obj.get("Slug") or obj.get("rawSlug")
    typ = obj.get("type") or obj.get("Type")
    name = obj.get("name") or obj.get("Name")
    if slug and (typ is not None or name is not None):
        found.append((str(slug), str(typ or "")))
    for value in obj.values():
        walk(value, found)

raw = json.load(sys.stdin)
found = []
walk(raw, found)
seen, slugs, personal = set(), [], []
for slug, typ in found:
    if slug in seen:
        continue
    seen.add(slug)
    slugs.append(slug)
    if "personal" in typ.lower() or slug == "personal":
        personal.append(slug)
if len(slugs) == 1:
    print(slugs[0])
elif len(personal) == 1:
    print(personal[0])
'
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

org=""
if command -v flyctl >/dev/null 2>&1; then
  if flyctl orgs list --json >"$tmp/orgs.json" 2>"$tmp/orgs.err"; then
    org="$(pick_slug <"$tmp/orgs.json" || true)"
  fi
fi

if [ -z "$org" ] && [ -n "${FLY_API_TOKEN:-}" ]; then
  if command -v curl >/dev/null 2>&1; then
    curl -sS "https://api.fly.io/graphql" \
      -H "Authorization: Bearer ${FLY_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"query":"{ organizations { nodes { slug type name } } }"}' \
      >"$tmp/gql.json" || true
    if [ -s "$tmp/gql.json" ]; then
      org="$(pick_slug <"$tmp/gql.json" || true)"
    fi
  fi
fi

if [ -z "$org" ]; then
  echo "Fly org list was empty; trying personal. Set vars.FLY_ORG if create fails." >&2
  org="personal"
fi

printf '%s\n' "$org"
