#!/usr/bin/env bash

compose() {
  docker compose "$@"
}

compose_service_running() {
  local service_name="$1"

  [ "$(compose ps --status running --services "$service_name" | wc -l | tr -d ' ')" != "0" ]
}

wait_for_postgres() {
  local retries="${POSTGRES_READY_RETRIES:-30}"
  local sleep_seconds="${POSTGRES_READY_SLEEP_SECONDS:-2}"

  for attempt in $(seq 1 "$retries"); do
    if compose exec -T postgres pg_isready -U eduflow -d eduflow >/dev/null 2>&1; then
      log_info "PostgreSQL siap."
      return 0
    fi

    log_info "Menunggu PostgreSQL siap (${attempt}/${retries})..."
    sleep "$sleep_seconds"
  done

  log_error "PostgreSQL belum siap setelah ${retries} percobaan."
  return 1
}
