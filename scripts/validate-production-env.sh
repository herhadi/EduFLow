#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

# Production uses app-scoped environment files. Do not require or create a root .env.
BACKEND_ENV="apps/backend/.env"
FRONTEND_ENV="apps/frontend/.env.local"
for file in "$BACKEND_ENV" "$FRONTEND_ENV"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: required environment file is missing: $file" >&2
    exit 1
  fi
done

if ! command -v docker >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: docker and python3 are required for production environment validation." >&2
  exit 1
fi

# Parse values without printing them. The backend env file remains the source of truth.
python3 - "$BACKEND_ENV" "$FRONTEND_ENV" <<'PY'
import sys
from urllib.parse import urlparse

def read_env(path):
    result = {}
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            result[key.strip()] = value
    return result

backend = read_env(sys.argv[1])
frontend = read_env(sys.argv[2])
required = ("DATABASE_URL", "JWT_SECRET", "DEFAULT_USER_PASSWORD", "FRONTEND_URL", "FRONTEND_ALLOWED_ORIGINS")
missing = [key for key in required if not backend.get(key, "").strip()]
missing += [key for key in ("NEXT_PUBLIC_API_URL", "BACKEND_INTERNAL_API_URL") if not frontend.get(key, "").strip()]
if missing:
    print("ERROR: missing required settings: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)

db = urlparse(backend["DATABASE_URL"])
if db.scheme not in ("postgres", "postgresql") or db.hostname not in ("postgres", "localhost", "127.0.0.1"):
    print("ERROR: DATABASE_URL must use a supported PostgreSQL host.", file=sys.stderr)
    sys.exit(1)

frontend_url = backend["FRONTEND_URL"].rstrip("/")
origins = [x.strip().rstrip("/") for x in backend["FRONTEND_ALLOWED_ORIGINS"].split(",") if x.strip()]
if not frontend_url.startswith("https://") or frontend_url not in origins:
    print("ERROR: FRONTEND_URL must be HTTPS and included in FRONTEND_ALLOWED_ORIGINS.", file=sys.stderr)
    sys.exit(1)

# Legacy secrets are not rotated automatically during deployment. Warn rather than
# blocking a release; rotate them in a separately planned maintenance window.
warnings = []
if len(backend["JWT_SECRET"]) < 32:
    warnings.append("JWT_SECRET is shorter than 32 characters")
if len(backend["DEFAULT_USER_PASSWORD"]) < 12:
    warnings.append("DEFAULT_USER_PASSWORD is shorter than 12 characters")
if warnings:
    print("WARNING: " + "; ".join(warnings) + ". Plan a separate credentials rotation.")
print("Production app-scoped environment validation passed.")
PY

# Check Compose can resolve its configuration without requiring a root-level .env.
docker compose config --quiet
