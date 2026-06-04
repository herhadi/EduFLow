#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: CONFIRM_RESTORE=eduflow $0 backups/postgres/eduflow-YYYYMMDD-HHMMSS.dump"
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "eduflow" ]; then
  echo "Restore PostgreSQL akan menimpa database target."
  echo "Jalankan ulang dengan CONFIRM_RESTORE=eduflow jika sudah yakin."
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-eduflow}"
POSTGRES_USER="${POSTGRES_USER:-eduflow}"
BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "File backup tidak ditemukan: ${BACKUP_FILE}"
  exit 1
fi

echo "Restore PostgreSQL dari: ${BACKUP_FILE}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  sh -c "dropdb -U '${POSTGRES_USER}' --if-exists '${POSTGRES_DB}' && createdb -U '${POSTGRES_USER}' '${POSTGRES_DB}'"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --no-privileges \
  < "${BACKUP_FILE}"

echo "Restore PostgreSQL selesai."
