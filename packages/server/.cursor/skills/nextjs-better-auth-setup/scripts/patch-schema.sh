#!/usr/bin/env bash
# Idempotently ensure src/db/schema.ts re-exports auth-schema.
# Usage: patch-schema.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || die "--root requires a path"
      ROOT="$2"
      shift 2
      ;;
    --root=*)
      ROOT="${1#--root=}"
      shift
      ;;
    --help|-h)
      echo "Usage: patch-schema.sh --root <project>"
      echo "Appends export * from \"./auth/auth-schema\" if missing."
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

SCHEMA="${ROOT}/src/db/schema.ts"
mkdir -p "${ROOT}/src/db"

EXPORT_LINE='export * from "./auth/auth-schema";'

if [[ -f "$SCHEMA" ]] && schema_exports_auth "$ROOT"; then
  echo "OK: src/db/schema.ts already exports auth-schema"
  exit 0
fi

if [[ ! -f "$SCHEMA" ]] || [[ ! -s "$SCHEMA" ]]; then
  printf '%s\n' "$EXPORT_LINE" >"$SCHEMA"
  echo "Wrote src/db/schema.ts with auth-schema export"
  exit 0
fi

# Append if file has other content
if [[ -n "$(tail -c1 "$SCHEMA" 2>/dev/null || true)" ]]; then
  printf '\n' >>"$SCHEMA"
fi
printf '%s\n' "$EXPORT_LINE" >>"$SCHEMA"
echo "Appended auth-schema export to src/db/schema.ts"
