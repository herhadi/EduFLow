#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-eduflow}"
POSTGRES_USER="${POSTGRES_USER:-eduflow}"
EXPORT_DIR="${EXPORT_DIR:-backups/transfer}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${1:-${EXPORT_DIR}/eduflow-without-root-${TIMESTAMP}.dump}"
CLEANUP_SQL="${ROOT_DIR}/infra/backup/sql/exclude-root-users.sql"
TEMP_DB="eduflow_export_${TIMESTAMP}_$$"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/eduflow-export.XXXXXX")"
SOURCE_DUMP="${TEMP_DIR}/source.dump"

cleanup() {
  docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
    dropdb -U "${POSTGRES_USER}" --if-exists "${TEMP_DB}" >/dev/null 2>&1 || true
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT HUP INT TERM

if [ -e "${OUTPUT_FILE}" ]; then
  echo "File export sudah ada: ${OUTPUT_FILE}"
  exit 1
fi

if [ ! -f "${CLEANUP_SQL}" ]; then
  echo "SQL pembersihan root tidak ditemukan: ${CLEANUP_SQL}"
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

echo "Memeriksa PostgreSQL sumber..."
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null

echo "Membuat database sementara untuk export tanpa root..."
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  createdb -U "${POSTGRES_USER}" "${TEMP_DB}"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c --no-owner --no-privileges \
  > "${SOURCE_DUMP}"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore -U "${POSTGRES_USER}" -d "${TEMP_DB}" --exit-on-error --no-owner --no-privileges \
  < "${SOURCE_DUMP}"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${TEMP_DB}" \
  < "${CLEANUP_SQL}"

remaining_root_users="$(docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -At -U "${POSTGRES_USER}" -d "${TEMP_DB}" -c \
  "SELECT count(*) FROM \"User\" INNER JOIN \"UserRole\" ON \"UserRole\".\"userId\" = \"User\".\"id\" INNER JOIN \"Role\" ON \"Role\".\"id\" = \"UserRole\".\"roleId\" WHERE \"Role\".\"name\" = 'root';")"

if [ "${remaining_root_users}" != "0" ]; then
  echo "Export dibatalkan: akun root masih ditemukan pada database sementara."
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${TEMP_DB}" -F c --no-owner --no-privileges \
  > "${OUTPUT_FILE}"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
fi

echo "Export tanpa akun role root selesai: ${OUTPUT_FILE}"
