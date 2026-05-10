#!/bin/bash
set -euo pipefail

# ============================================
# Database Backup Script
# ============================================
# Backs up PostgreSQL database to Cloudflare R2
# Schedule via cron or Inngest
#
# Required env vars:
#   DATABASE_URL - PostgreSQL connection string
#   R2_ACCESS_KEY_ID - Cloudflare R2 access key
#   R2_SECRET_ACCESS_KEY - Cloudflare R2 secret key
#   R2_BUCKET_NAME - R2 bucket for backups
#   R2_ENDPOINT - R2 endpoint URL
#
# Optional:
#   BACKUP_RETENTION_DAYS - Days to keep backups (default: 7)
#   SLACK_WEBHOOK_URL - For notifications

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/nebutra-backups"
BACKUP_FILE="nebutra_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

notify_slack() {
  local message="$1"
  local color="$2"

  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"Database Backup\",
          \"text\": \"$message\",
          \"ts\": $(date +%s)
        }]
      }" > /dev/null || true
  fi
}

cleanup() {
  log_info "Cleaning up temporary files..."
  rm -rf "$BACKUP_DIR"
}

trap cleanup EXIT

# ============================================
# Validation
# ============================================

check_env() {
  local missing=()

  [ -z "${DATABASE_URL:-}" ] && missing+=("DATABASE_URL")
  [ -z "${R2_ACCESS_KEY_ID:-}" ] && missing+=("R2_ACCESS_KEY_ID")
  [ -z "${R2_SECRET_ACCESS_KEY:-}" ] && missing+=("R2_SECRET_ACCESS_KEY")
  [ -z "${R2_BUCKET_NAME:-}" ] && missing+=("R2_BUCKET_NAME")
  [ -z "${R2_ENDPOINT:-}" ] && missing+=("R2_ENDPOINT")

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${missing[*]}"
    exit 1
  fi
}

# ============================================
# Backup Functions
# ============================================

create_backup() {
  log_info "Creating backup directory..."
  mkdir -p "$BACKUP_DIR"

  log_info "Dumping database..."
  pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

  local size=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
  log_info "Backup created: $BACKUP_FILE ($size)"
}

upload_to_r2() {
  log_info "Uploading to R2..."

  # Configure AWS CLI for R2
  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" \
    "s3://$R2_BUCKET_NAME/backups/$BACKUP_FILE" \
    --endpoint-url "$R2_ENDPOINT"

  log_info "Upload complete: s3://$R2_BUCKET_NAME/backups/$BACKUP_FILE"
}

cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."

  export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

  # List and delete old backups
  local cutoff_date=$(date -d "-$RETENTION_DAYS days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

  aws s3 ls "s3://$R2_BUCKET_NAME/backups/" \
    --endpoint-url "$R2_ENDPOINT" | while read -r line; do
    local file=$(echo "$line" | awk '{print $4}')
    local file_date=$(echo "$file" | grep -oP '\d{8}' | head -1)

    if [ -n "$file_date" ] && [ "$file_date" -lt "$cutoff_date" ]; then
      log_info "Deleting old backup: $file"
      aws s3 rm "s3://$R2_BUCKET_NAME/backups/$file" \
        --endpoint-url "$R2_ENDPOINT"
    fi
  done
}

# ============================================
# Main
# ============================================

main() {
  log_info "Starting database backup..."
  log_info "Timestamp: $TIMESTAMP"

  check_env

  if create_backup; then
    if upload_to_r2; then
      cleanup_old_backups
      notify_slack "✅ Database backup completed successfully\\nFile: $BACKUP_FILE" "good"
      log_info "Backup completed successfully!"
    else
      notify_slack "❌ Database backup failed: Upload error" "danger"
      log_error "Upload failed!"
      exit 1
    fi
  else
    notify_slack "❌ Database backup failed: Dump error" "danger"
    log_error "Backup creation failed!"
    exit 1
  fi
}

main "$@"
