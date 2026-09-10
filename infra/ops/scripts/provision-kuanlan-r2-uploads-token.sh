#!/usr/bin/env bash
# Kuanlan Moments lists nebutra-uploads over S3. Mint its own Object Read &
# Write key and stage it onto Fly nebutra-kuanlan.
#
# The shared GitHub R2_* secret is the assets seeder and is AccessDenied here —
# deploy-fly.yml keeps it out via SKIP_IMPORT_KEYS. Re-run only when
# ListObjects is 403 again.
set -euo pipefail

export FLY_APP="${FLY_APP:-nebutra-kuanlan}"
export R2_TOKEN_NAME="${R2_TOKEN_NAME:-nebutra-kuanlan-moments}"
export R2_GH_SECRET_PREFIX="${R2_GH_SECRET_PREFIX:-R2_KUANLAN}"

exec bash "$(dirname "$0")/provision-r2-uploads-token.sh"
