#!/usr/bin/env bash
# The python-ai origin PUTs generated images into nebutra-uploads
# (UPLOAD_STORAGE_PROVIDER=r2). Mint its own Object Read & Write key and stage
# it onto Fly nebutra-ai.
#
# Why its own key: the shared GitHub R2_* secret is the assets seeder. It has
# no Object Write on nebutra-uploads, so every generation failed at persist
# time while the service itself looked healthy. deploy-ai-origin-fly.yml must
# not stage the shared pair over this one.
#
# R2_VERIFY_PUT=1 because listing is not the capability this app needs.
set -euo pipefail

export FLY_APP="${FLY_APP:-nebutra-ai}"
export R2_TOKEN_NAME="${R2_TOKEN_NAME:-nebutra-ai-origin-uploads}"
export R2_VERIFY_PUT=1
export R2_GH_SECRET_PREFIX="${R2_GH_SECRET_PREFIX:-R2_ORIGIN}"

exec bash "$(dirname "$0")/provision-r2-uploads-token.sh"
