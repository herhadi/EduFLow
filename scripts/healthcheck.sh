#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

source "${ROOT_DIR}/scripts/lib/log.sh"
source "${ROOT_DIR}/scripts/lib/common.sh"
source "${ROOT_DIR}/scripts/lib/docker.sh"

FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://localhost:3000/api/health}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3001/health}"
HEALTHCHECK_SERVICES="${HEALTHCHECK_SERVICES:-postgres redis backend frontend}"
HTTP_HEALTH_RETRIES="${HTTP_HEALTH_RETRIES:-12}"
HTTP_HEALTH_SLEEP_SECONDS="${HTTP_HEALTH_SLEEP_SECONDS:-5}"

require_command docker
require_command curl

cd "$ROOT_DIR"

read -r -a services <<< "$HEALTHCHECK_SERVICES"

check_http() {
  local name="$1"
  local url="$2"
  local attempt
  local status
  local curl_exit

  for attempt in $(seq 1 "$HTTP_HEALTH_RETRIES"); do
    curl_exit=0
    status="$(
      curl \
        --silent \
        --show-error \
        --output /dev/null \
        --write-out "%{http_code}" \
        --max-time 20 \
        "$url" 2>&1
    )" || curl_exit="$?"

    if [ "$curl_exit" = "0" ] && [ "$status" = "200" ]; then
      log_info "${name} OK: ${url}"
      return 0
    fi

    log_warn "${name} belum siap (${attempt}/${HTTP_HEALTH_RETRIES}): ${url} -> status=${status}, curl_exit=${curl_exit}"
    sleep "$HTTP_HEALTH_SLEEP_SECONDS"
  done

  log_error "${name} health check gagal: ${url}"
  return 1
}

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
  check_http "Backend" "$BACKEND_HEALTH_URL"
fi

if [[ " ${services[*]} " == *" frontend "* ]]; then
  check_http "Frontend" "$FRONTEND_HEALTH_URL"
fi

log_info "Health check selesai."
