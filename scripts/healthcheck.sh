#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

source "${ROOT_DIR}/scripts/lib/log.sh"
source "${ROOT_DIR}/scripts/lib/common.sh"
source "${ROOT_DIR}/scripts/lib/docker.sh"

FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://localhost:3000/login}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3001/health}"

require_command docker
require_command curl

cd "$ROOT_DIR"

log_section "Health check container"

for service in postgres redis backend frontend; do
  if ! compose_service_running "$service"; then
    log_error "Service tidak running: ${service}"
    exit 1
  fi

  log_info "Service running: ${service}"
done

log_section "Health check HTTP"

curl --fail --silent --show-error --max-time 20 "$BACKEND_HEALTH_URL" >/dev/null
log_info "Backend OK: ${BACKEND_HEALTH_URL}"

curl --fail --silent --show-error --max-time 20 "$FRONTEND_HEALTH_URL" >/dev/null
log_info "Frontend OK: ${FRONTEND_HEALTH_URL}"

log_info "Health check selesai."
