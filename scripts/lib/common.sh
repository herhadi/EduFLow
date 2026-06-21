#!/usr/bin/env bash

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    log_error "Command tidak ditemukan: ${command_name}"
    exit 1
  fi
}

require_file() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    log_error "File wajib tidak ditemukan: ${file_path}"
    exit 1
  fi
}

acquire_lock() {
  local lock_file="$1"

  exec 9>"$lock_file"

  if ! flock -n 9; then
    log_error "Deployment lain masih berjalan. Lock: ${lock_file}"
    exit 1
  fi
}

is_zero_sha() {
  local sha="$1"

  [ "$sha" = "0000000000000000000000000000000000000000" ]
}
