#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${EDUFLOW_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "ERROR: root .env is required for staging/production Docker Compose." >&2
  echo "Copy .env.example to .env and replace all CHANGE_ME values with real configuration." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: docker and python3 are required for production environment validation." >&2
  exit 1
fi

# Parse the resolved Compose configuration in memory only; never print secrets.
compose_config="$(docker compose config --format json)"
printf '%s' "$compose_config" | python3 -c '
import json, sys
from urllib.parse import urlparse, unquote

try:
    cfg = json.load(sys.stdin)
    backend = cfg["services"]["backend"]["environment"]
    postgres = cfg["services"]["postgres"]["environment"]
except Exception:
    print("ERROR: unable to read resolved Docker Compose environment.", file=sys.stderr)
    sys.exit(1)

required = {
    "DATABASE_URL": backend.get("DATABASE_URL", ""),
    "JWT_SECRET": backend.get("JWT_SECRET", ""),
    "DEFAULT_USER_PASSWORD": backend.get("DEFAULT_USER_PASSWORD", ""),
    "ROOT_EMAIL": backend.get("ROOT_EMAIL", ""),
    "ROOT_PASSWORD": backend.get("ROOT_PASSWORD", ""),
    "FRONTEND_URL": backend.get("FRONTEND_URL", ""),
    "FRONTEND_ALLOWED_ORIGINS": backend.get("FRONTEND_ALLOWED_ORIGINS", ""),
    "POSTGRES_PASSWORD": postgres.get("POSTGRES_PASSWORD", ""),
}
for key, value in required.items():
    if not isinstance(value, str) or not value.strip():
        print(f"ERROR: required setting {key} is empty.", file=sys.stderr)
        sys.exit(1)

for key in ("JWT_SECRET", "DEFAULT_USER_PASSWORD", "ROOT_PASSWORD", "POSTGRES_PASSWORD"):
    value = required[key]
    lowered = value.lower()
    if any(token in lowered for token in ("change_me", "replace-this-in-development", "123456", "password", "example.invalid")):
        print(f"ERROR: {key} still looks like a placeholder or weak default.", file=sys.stderr)
        sys.exit(1)

if len(required["JWT_SECRET"]) < 32:
    print("ERROR: JWT_SECRET must contain at least 32 characters.", file=sys.stderr)
    sys.exit(1)
for key in ("DEFAULT_USER_PASSWORD", "ROOT_PASSWORD"):
    if len(required[key]) < 12:
        print(f"ERROR: {key} must contain at least 12 characters.", file=sys.stderr)
        sys.exit(1)
if len(required["POSTGRES_PASSWORD"]) < 16:
    print("ERROR: POSTGRES_PASSWORD must contain at least 16 characters.", file=sys.stderr)
    sys.exit(1)

try:
    db = urlparse(required["DATABASE_URL"])
    if db.scheme not in ("postgres", "postgresql") or db.hostname != "postgres" or db.port != 5432:
        raise ValueError
    if unquote(db.password or "") != required["POSTGRES_PASSWORD"]:
        print("ERROR: DATABASE_URL password must match POSTGRES_PASSWORD.", file=sys.stderr)
        sys.exit(1)
except Exception:
    print("ERROR: DATABASE_URL must target postgres:5432 and use the matching encoded database password.", file=sys.stderr)
    sys.exit(1)

frontend_url = required["FRONTEND_URL"].rstrip("/")
origins = [x.strip().rstrip("/") for x in required["FRONTEND_ALLOWED_ORIGINS"].split(",") if x.strip()]
if not frontend_url.startswith("https://") or frontend_url not in origins:
    print("ERROR: FRONTEND_URL must be HTTPS and included in FRONTEND_ALLOWED_ORIGINS.", file=sys.stderr)
    sys.exit(1)
if "*" in required["FRONTEND_ALLOWED_ORIGINS"] or "localhost" in frontend_url.lower() or "your-eduflow-domain.example" in frontend_url:
    print("ERROR: frontend origin still looks like a development/example value.", file=sys.stderr)
    sys.exit(1)
if "example.invalid" in required["ROOT_EMAIL"].lower() or "change_me" in required["ROOT_EMAIL"].lower():
    print("ERROR: ROOT_EMAIL still looks like a placeholder.", file=sys.stderr)
    sys.exit(1)

print("Production environment validation passed; required secrets and origins are configured.")
'
