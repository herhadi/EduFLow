#!/usr/bin/env bash

timestamp() {
  date +"%Y-%m-%d %H:%M:%S%z"
}

log_info() {
  printf '[%s] [INFO] %s\n' "$(timestamp)" "$*"
}

log_warn() {
  printf '[%s] [WARN] %s\n' "$(timestamp)" "$*" >&2
}

log_error() {
  printf '[%s] [ERROR] %s\n' "$(timestamp)" "$*" >&2
}

log_section() {
  printf '\n[%s] [STEP] %s\n' "$(timestamp)" "$*"
}
