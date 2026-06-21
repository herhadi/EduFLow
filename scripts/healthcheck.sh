#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

source "${ROOT_DIR}/scripts/lib/log.sh"
source "${ROOT_DIR}/scripts/lib/common.sh"
source "${ROOT_DIR}/scripts/lib/docker.sh"

FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://localhost:3000/login}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3001/health}"
HEALTHCHECK_SERVICES="${HEALTHCHECK_SERVICES:-postgres redis backend frontend}"

require_command docker
require_command curl

cd "$ROOT_DIR"

read -r -a services <<< "$HEALTHCHECK_SERVICES"

log_section "Health check container"

for service in "${services[@]}"; do
  if ! compose_service_running "$service"; then
    log_error "Service tidak running: ${service}"
    exit 1
  fi

  log_info "Service running: ${service}"
done

log_section "Health check HTTP"

if [[ " ${services[*]} " == *" backend "* ]]; then
  curl --fail --silent --show-error --max-time 20 "$BACKEND_HEALTH_URL" >/dev/null
  log_info "Backend OK: ${BACKEND_HEALTH_URL}"
fi

if [[ " ${services[*]} " == *" frontend "* ]]; then
  curl --fail --silent --show-error --max-time 20 "$FRONTEND_HEALTH_URL" >/dev/null
  log_info "Frontend OK: ${FRONTEND_HEALTH_URL}"
fi

log_info "Health check selesai."
