#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
REDIS_SERVICE="${REDIS_SERVICE:-redis}"
BACKUP_DIR="${BACKUP_DIR:-backups/redis}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.rdb"

mkdir -p "${BACKUP_DIR}"

echo "Meminta Redis membuat snapshot RDB..."
LAST_SAVE_BEFORE="$(docker compose -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" redis-cli LASTSAVE | tr -d '\r')"
docker compose -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" redis-cli BGSAVE >/dev/null

echo "Menunggu snapshot selesai..."
WAIT_SECONDS=0
while [ "$(docker compose -f "${COMPOSE_FILE}" exec -T "${REDIS_SERVICE}" redis-cli LASTSAVE | tr -d '\r')" = "${LAST_SAVE_BEFORE}" ]; do
  sleep 1
  WAIT_SECONDS=$((WAIT_SECONDS + 1))

  if [ "${WAIT_SECONDS}" -ge 30 ]; then
    echo "Timeout menunggu BGSAVE. Cek status Redis sebelum menggunakan backup."
    exit 1
  fi
done

docker compose -f "${COMPOSE_FILE}" cp "${REDIS_SERVICE}:/data/dump.rdb" "${OUTPUT_FILE}"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT_FILE}" > "${OUTPUT_FILE}.sha256"
fi

echo "Backup Redis selesai: ${OUTPUT_FILE}"
