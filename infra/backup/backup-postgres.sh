#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-eduflow}"
POSTGRES_USER="${POSTGRES_USER:-eduflow}"
BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${POSTGRES_DB}-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "Membuat backup PostgreSQL: ${OUTPUT_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c --no-owner --no-privileges \
  > "${OUTPUT_FILE}"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
fi

echo "Backup PostgreSQL selesai: ${OUTPUT_FILE}"
