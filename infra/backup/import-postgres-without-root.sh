#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: CONFIRM_IMPORT=eduflow $0 backups/transfer/eduflow-without-root-YYYYMMDD-HHMMSS.dump"
  exit 1
fi

if [ "${CONFIRM_IMPORT:-}" != "eduflow" ]; then
  echo "Import akan menimpa seluruh database target dan membuat ulang akun root dari environment Debian."
  echo "Jalankan ulang dengan CONFIRM_IMPORT=eduflow jika sudah yakin."
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-eduflow}"
POSTGRES_USER="${POSTGRES_USER:-eduflow}"
BACKUP_DIR="${BACKUP_DIR:-backups/pre-import}"
IMPORT_FILE="$1"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_BACKUP="${BACKUP_DIR}/${POSTGRES_DB}-before-import-${TIMESTAMP}.dump"

if [ ! -f "${IMPORT_FILE}" ]; then
  echo "File import tidak ditemukan: ${IMPORT_FILE}"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "Memeriksa PostgreSQL target..."
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null

echo "Membuat backup target sebelum import: ${TARGET_BACKUP}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c --no-owner --no-privileges \
  > "${TARGET_BACKUP}"

echo "Menghentikan backend dan frontend..."
docker compose -f "${COMPOSE_FILE}" stop backend frontend

echo "Menimpa database target dari export tanpa root..."
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  sh -c "dropdb -U '${POSTGRES_USER}' --if-exists '${POSTGRES_DB}' && createdb -U '${POSTGRES_USER}' '${POSTGRES_DB}'"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --exit-on-error --no-owner --no-privileges \
  < "${IMPORT_FILE}"

echo "Menerapkan migration dan membuat root dari environment Debian..."
docker compose -f "${COMPOSE_FILE}" run --rm --no-deps backend \
  npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
docker compose -f "${COMPOSE_FILE}" run --rm --no-deps backend \
  npm run prisma:seed --workspace backend

echo "Menyalakan kembali aplikasi..."
docker compose -f "${COMPOSE_FILE}" up -d backend frontend

echo "Import selesai. Backup database sebelum import: ${TARGET_BACKUP}"
