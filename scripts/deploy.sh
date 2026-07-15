#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${EDUFLOW_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
ROOT_PARENT_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
LOG_DIR="${DEPLOY_LOG_DIR:-${ROOT_PARENT_DIR}/logs/deploy}"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/eduflow-deploy.lock}"
BRANCH="${DEPLOY_BRANCH:-main}"
STARTED_AT="$(date +%s)"
FRONTEND_STATUS="Skip"
BACKEND_STATUS="Skip"
MIGRATION_STATUS="No"
SEED_STATUS="No"
BACKUP_STATUS="No"
ROLLBACK_STATUS="Not needed"
DEPLOY_STATUS="FAILED"
HEAD_SHA=""
RESTART_PERFORMED=0
export PRISMA_HIDE_UPDATE_MESSAGE="${PRISMA_HIDE_UPDATE_MESSAGE:-1}"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

source "${SCRIPT_DIR}/lib/log.sh"
source "${SCRIPT_DIR}/lib/common.sh"
source "${SCRIPT_DIR}/lib/docker.sh"

print_summary() {
  local finished_at duration commit

  finished_at="$(date +%s)"
  duration="$((finished_at - STARTED_AT))"
  commit="${HEAD_SHA:-unknown}"

  if [ "$commit" != "unknown" ]; then
    commit="$(printf '%s' "$commit" | cut -c1-7)"
  fi

  cat <<SUMMARY

====================================
EduFlow Deployment

Branch      : ${BRANCH}
Commit      : ${commit}
Frontend    : ${FRONTEND_STATUS}
Backend     : ${BACKEND_STATUS}
Migration   : ${MIGRATION_STATUS}
Seed        : ${SEED_STATUS}
Backup      : ${BACKUP_STATUS}
Rollback    : ${ROLLBACK_STATUS}
Duration    : ${duration}s

Status      : ${DEPLOY_STATUS}
====================================
SUMMARY
}

backup_database_before_migration() {
  local backup_dir backup_file commit_short

  if [ "${DEPLOY_SKIP_PRE_MIGRATION_BACKUP:-0}" = "1" ]; then
    BACKUP_STATUS="Skip"
    log_warn "Backup database sebelum migration dilewati karena DEPLOY_SKIP_PRE_MIGRATION_BACKUP=1."
    return 0
  fi

  backup_dir="${DEPLOY_BACKUP_DIR:-${ROOT_PARENT_DIR}/backups/pre-migrate}"
  mkdir -p "$backup_dir"

  commit_short="${HEAD_SHA:-unknown}"
  if [ "$commit_short" != "unknown" ]; then
    commit_short="$(printf '%s' "$commit_short" | cut -c1-7)"
  fi

  backup_file="${backup_dir}/eduflow-before-migrate-$(date +%Y%m%d-%H%M%S)-${commit_short}.dump"

  log_section "Backup database sebelum migration"
  compose exec -T postgres pg_dump -U eduflow -d eduflow -Fc --no-owner --no-privileges > "$backup_file"
  BACKUP_STATUS="Yes ($(basename "$backup_file"))"
  log_info "Backup database tersimpan: ${backup_file}"
}

rollback_deploy() {
  local failed_command="$1"

  if [ "${DEPLOY_ENABLE_ROLLBACK:-1}" != "1" ]; then
    ROLLBACK_STATUS="Disabled"
    log_warn "Rollback otomatis dilewati karena DEPLOY_ENABLE_ROLLBACK=0."
    return 0
  fi

  if [ "$RESTART_PERFORMED" != "1" ]; then
    ROLLBACK_STATUS="Not needed"
    log_info "Rollback tidak diperlukan karena service aplikasi belum direstart."
    return 0
  fi

  if [ -z "${PREVIOUS_HEAD:-}" ] || [ -z "${HEAD_SHA:-}" ] || [ "$PREVIOUS_HEAD" = "$HEAD_SHA" ]; then
    ROLLBACK_STATUS="Skipped"
    log_warn "Rollback dilewati karena commit sebelumnya tidak berbeda atau tidak tersedia."
    return 0
  fi

  if ! git cat-file -e "${PREVIOUS_HEAD}^{commit}" >/dev/null 2>&1; then
    ROLLBACK_STATUS="Failed"
    log_error "Rollback gagal: commit sebelumnya tidak ditemukan (${PREVIOUS_HEAD})."
    return 0
  fi

  log_section "Rollback otomatis"
  log_warn "Memulai rollback karena command gagal: ${failed_command}"

  if [ "$MIGRATION_STATUS" = "Yes" ]; then
    log_warn "Migration sudah berjalan. Rollback otomatis hanya mengembalikan kode/container, bukan schema database."
    log_warn "Gunakan backup pre-migration jika rollback database diperlukan."
  fi

  if ! git reset --hard "$PREVIOUS_HEAD"; then
    ROLLBACK_STATUS="Failed"
    log_error "Rollback gagal saat reset source ke commit sebelumnya."
    return 0
  fi

  if [ "${#RESTART_SERVICES[@]}" -eq 0 ]; then
    ROLLBACK_STATUS="Success"
    log_info "Rollback source selesai; tidak ada service yang perlu direstart."
    return 0
  fi

  if ! compose build "${RESTART_SERVICES[@]}"; then
    ROLLBACK_STATUS="Failed"
    log_error "Rollback gagal saat build image commit sebelumnya."
    return 0
  fi

  if ! compose up -d --no-deps "${RESTART_SERVICES[@]}"; then
    ROLLBACK_STATUS="Failed"
    log_error "Rollback gagal saat restart service commit sebelumnya."
    return 0
  fi

  if ! HEALTHCHECK_SERVICES="${RESTART_SERVICES[*]}" EDUFLOW_ROOT="$ROOT_DIR" bash "${SCRIPT_DIR}/healthcheck.sh"; then
    ROLLBACK_STATUS="Failed"
    log_error "Rollback service berjalan, tetapi health check rollback gagal."
    return 0
  fi

  ROLLBACK_STATUS="Success"
  log_info "Rollback otomatis selesai dan health check berhasil."
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  local failed_command="$3"

  set +e
  log_error "Deployment gagal di line ${line_no}."
  log_error "Command: ${failed_command}"
  log_error "Exit code: ${exit_code}"
  rollback_deploy "$failed_command"
  print_summary
  exit "$exit_code"
}

trap 'on_error "$?" "$LINENO" "$BASH_COMMAND"' ERR

require_command git
require_command docker
require_command flock
require_file "${ROOT_DIR}/docker-compose.yml"

cd "$ROOT_DIR"
acquire_lock "$LOCK_FILE"

PREVIOUS_HEAD="$(git rev-parse HEAD)"
BASE_SHA="${DEPLOY_BASE_SHA:-$PREVIOUS_HEAD}"

log_section "Mulai deployment EduFlow"
log_info "Root: ${ROOT_DIR}"
log_info "Docker build context: ${ROOT_DIR}"
log_info "Branch target: ${BRANCH}"
log_info "Log file: ${LOG_FILE}"

log_section "Update source code"

if [ -n "$(git status --porcelain)" ]; then
  log_error "Repository production tidak bersih. Bersihkan perubahan lokal sebelum deploy."
  git status --short
  print_summary
  exit 1
fi

git fetch origin "$BRANCH"

REMOTE_REF="origin/${BRANCH}"
git reset --hard "$REMOTE_REF"

HEAD_SHA="${DEPLOY_HEAD_SHA:-$(git rev-parse HEAD)}"

if is_zero_sha "$BASE_SHA" || ! git cat-file -e "${BASE_SHA}^{commit}" >/dev/null 2>&1; then
  log_warn "Base SHA tidak tersedia. Semua service akan dibuild."
  CHANGED_FILES="__BUILD_ALL__"
else
  CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" || true)"
fi

if [ -z "$CHANGED_FILES" ]; then
  log_info "Tidak ada perubahan terdeteksi. Deployment dilewati."
  DEPLOY_STATUS="SUCCESS"
  print_summary
  exit 0
fi

log_section "Deteksi perubahan"
printf '%s\n' "$CHANGED_FILES"

BUILD_FRONTEND=0
BUILD_BACKEND=0
RUN_MIGRATION=0
RUN_DEPLOY=0
START_INFRA=0

while IFS= read -r changed_file; do
  case "$changed_file" in
    __BUILD_ALL__|docker-compose.yml|package.json|package-lock.json|.dockerignore)
      BUILD_FRONTEND=1
      BUILD_BACKEND=1
      RUN_MIGRATION=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    apps/frontend/*)
      BUILD_FRONTEND=1
      RUN_DEPLOY=1
      ;;
    apps/backend/prisma/migrations/*|apps/backend/prisma/schema.prisma)
      BUILD_BACKEND=1
      RUN_MIGRATION=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    apps/backend/*)
      BUILD_BACKEND=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    packages/shared/*)
      BUILD_FRONTEND=1
      BUILD_BACKEND=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    scripts/*|.github/workflows/deploy.yml)
      RUN_DEPLOY=1
      ;;
  esac
done <<< "$CHANGED_FILES"

if [ "${DEPLOY_BUILD_ALL:-0}" = "1" ]; then
  BUILD_FRONTEND=1
  BUILD_BACKEND=1
  START_INFRA=1
  RUN_DEPLOY=1
fi

if [ "${DEPLOY_RUN_MIGRATION:-0}" = "1" ] || [ "${DEPLOY_RUN_SEED:-0}" = "1" ]; then
  START_INFRA=1
fi

if [ "$RUN_DEPLOY" = "0" ]; then
  log_info "Perubahan tidak membutuhkan deployment container."
  DEPLOY_STATUS="SUCCESS"
  print_summary
  exit 0
fi

if [ "$START_INFRA" = "1" ]; then
  log_section "Persiapan service dasar"
  compose up -d postgres redis
  wait_for_postgres
else
  log_info "Persiapan service dasar dilewati."
fi

if [ "$BUILD_BACKEND" = "1" ]; then
  log_section "Build backend image"
  compose build backend
  BACKEND_STATUS="Built"
else
  log_info "Backend build dilewati."
fi

if [ "$BUILD_FRONTEND" = "1" ]; then
  log_section "Build frontend image"
  compose build frontend
  FRONTEND_STATUS="Built"
else
  log_info "Frontend build dilewati."
fi

if [ "$RUN_MIGRATION" = "1" ] || [ "${DEPLOY_RUN_MIGRATION:-0}" = "1" ]; then
  backup_database_before_migration
  log_section "Prisma migrate deploy"
  compose run --rm backend npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
  MIGRATION_STATUS="Yes"
else
  log_info "Migration dilewati."
fi

if [ "${DEPLOY_RUN_SEED:-0}" = "1" ]; then
  log_section "Prisma seed"
  compose run --rm backend npm run prisma:seed --workspace backend
  SEED_STATUS="Yes"
fi

RESTART_SERVICES=()
HEALTHCHECK_SERVICES=()

if [ "$BUILD_BACKEND" = "1" ]; then
  RESTART_SERVICES+=("backend")
  HEALTHCHECK_SERVICES+=("backend")
fi

if [ "$BUILD_FRONTEND" = "1" ]; then
  RESTART_SERVICES+=("frontend")
  HEALTHCHECK_SERVICES+=("frontend")
fi

if [ "${#RESTART_SERVICES[@]}" -eq 0 ]; then
  log_info "Tidak ada service aplikasi yang perlu direstart."
else
  log_section "Restart aplikasi"
  RESTART_PERFORMED=1
  compose up -d --no-deps "${RESTART_SERVICES[@]}"
fi

log_section "Health check"
if [ "${#HEALTHCHECK_SERVICES[@]}" -eq 0 ]; then
  log_info "Health check dilewati karena tidak ada service aplikasi yang berubah."
else
  HEALTHCHECK_SERVICES="${HEALTHCHECK_SERVICES[*]}" EDUFLOW_ROOT="$ROOT_DIR" bash "${SCRIPT_DIR}/healthcheck.sh"
fi

log_section "Cleanup Docker"
docker image prune -af --filter "until=72h"

FINISHED_AT="$(date +%s)"
DURATION="$((FINISHED_AT - STARTED_AT))"
DEPLOY_STATUS="SUCCESS"

log_info "Deployment selesai dalam ${DURATION}s."
print_summary
