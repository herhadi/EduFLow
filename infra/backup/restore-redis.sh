#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: CONFIRM_RESTORE=eduflow $0 backups/redis/redis-YYYYMMDD-HHMMSS.rdb"
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "eduflow" ]; then
  echo "Restore Redis akan menimpa snapshot Redis saat ini."
  echo "Jalankan ulang dengan CONFIRM_RESTORE=eduflow jika sudah yakin."
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
REDIS_SERVICE="${REDIS_SERVICE:-redis}"
BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "File backup tidak ditemukan: ${BACKUP_FILE}"
  exit 1
fi

echo "Menghentikan Redis..."
docker compose -f "${COMPOSE_FILE}" stop "${REDIS_SERVICE}" >/dev/null

echo "Menyalin snapshot RDB ke container Redis..."
docker compose -f "${COMPOSE_FILE}" cp "${BACKUP_FILE}" "${REDIS_SERVICE}:/data/dump.rdb"

echo "Menjalankan Redis kembali..."
docker compose -f "${COMPOSE_FILE}" start "${REDIS_SERVICE}" >/dev/null

echo "Restore Redis selesai."
