#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOG_DIR="${DEPLOY_LOG_DIR:-${ROOT_DIR}/logs/deploy}"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/eduflow-deploy.lock}"
BRANCH="${DEPLOY_BRANCH:-main}"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

source "${ROOT_DIR}/scripts/lib/log.sh"
source "${ROOT_DIR}/scripts/lib/common.sh"
source "${ROOT_DIR}/scripts/lib/docker.sh"

trap 'log_error "Deployment gagal di line ${LINENO}."' ERR

require_command git
require_command docker
require_command flock
require_file "${ROOT_DIR}/docker-compose.yml"

cd "$ROOT_DIR"
acquire_lock "$LOCK_FILE"

STARTED_AT="$(date +%s)"
PREVIOUS_HEAD="$(git rev-parse HEAD)"
BASE_SHA="${DEPLOY_BASE_SHA:-$PREVIOUS_HEAD}"

log_section "Mulai deployment EduFlow"
log_info "Root: ${ROOT_DIR}"
log_info "Branch target: ${BRANCH}"
log_info "Log file: ${LOG_FILE}"

log_section "Update source code"

if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
fi

git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

HEAD_SHA="${DEPLOY_HEAD_SHA:-$(git rev-parse HEAD)}"

if is_zero_sha "$BASE_SHA" || ! git cat-file -e "${BASE_SHA}^{commit}" >/dev/null 2>&1; then
  log_warn "Base SHA tidak tersedia. Semua service akan dibuild."
  CHANGED_FILES="__BUILD_ALL__"
else
  CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" || true)"
fi

if [ -z "$CHANGED_FILES" ]; then
  log_info "Tidak ada perubahan terdeteksi. Deployment dilewati."
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
    apps/frontend/**|apps/frontend/Dockerfile)
      BUILD_FRONTEND=1
      RUN_DEPLOY=1
      ;;
    apps/backend/prisma/migrations/**|apps/backend/prisma/schema.prisma)
      BUILD_BACKEND=1
      RUN_MIGRATION=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    apps/backend/**|apps/backend/Dockerfile)
      BUILD_BACKEND=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    packages/shared/**)
      BUILD_FRONTEND=1
      BUILD_BACKEND=1
      START_INFRA=1
      RUN_DEPLOY=1
      ;;
    scripts/**|.github/workflows/deploy.yml)
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
else
  log_info "Backend build dilewati."
fi

if [ "$BUILD_FRONTEND" = "1" ]; then
  log_section "Build frontend image"
  compose build frontend
else
  log_info "Frontend build dilewati."
fi

if [ "$RUN_MIGRATION" = "1" ] || [ "${DEPLOY_RUN_MIGRATION:-0}" = "1" ]; then
  log_section "Prisma migrate deploy"
  compose run --rm backend npx prisma migrate deploy
else
  log_info "Migration dilewati."
fi

if [ "${DEPLOY_RUN_SEED:-0}" = "1" ]; then
  log_section "Prisma seed"
  compose run --rm backend npm run prisma:seed --workspace backend
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
  compose up -d --no-deps "${RESTART_SERVICES[@]}"
fi

log_section "Health check"
if [ "${#HEALTHCHECK_SERVICES[@]}" -eq 0 ]; then
  log_info "Health check dilewati karena tidak ada service aplikasi yang berubah."
else
  HEALTHCHECK_SERVICES="${HEALTHCHECK_SERVICES[*]}" "${ROOT_DIR}/scripts/healthcheck.sh"
fi

log_section "Cleanup Docker"
docker image prune -f

FINISHED_AT="$(date +%s)"
DURATION="$((FINISHED_AT - STARTED_AT))"

log_info "Deployment selesai dalam ${DURATION}s."
