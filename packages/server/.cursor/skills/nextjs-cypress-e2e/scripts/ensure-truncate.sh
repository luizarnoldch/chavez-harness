#!/usr/bin/env bash
# Ensure entity table is included in TRUNCATE in src/db/scripts/reset.ts
# Usage: ensure-truncate.sh --root <project> --entity <Entity>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
ENTITY=""

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
    --entity)
      [[ $# -ge 2 ]] || die "--entity requires a name"
      ENTITY="$2"
      shift 2
      ;;
    --entity=*)
      ENTITY="${1#--entity=}"
      shift
      ;;
    --help|-h)
      echo "Usage: ensure-truncate.sh --root <project> --entity <Entity>"
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
[[ -n "$ENTITY" ]] || die "Missing --entity <Entity>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"
validate_entity "$ENTITY"

TABLE=$(to_snake_case "$ENTITY")
RESET="${ROOT}/src/db/scripts/reset.ts"
[[ -f "$RESET" ]] || die "Missing $RESET"

python3 - "$RESET" "$TABLE" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
table = sys.argv[2]
text = path.read_text()

quoted = f'"{table}"'
if quoted in text:
    print(f"OK: reset.ts already truncates {quoted}")
    sys.exit(0)

# Insert table name after TRUNCATE TABLE
m = re.search(r'(TRUNCATE TABLE\s+)(")', text)
if not m:
    raise SystemExit("Error: TRUNCATE TABLE not found in reset.ts")

# Insert as first truncated table
text = text[: m.end(1)] + f"{quoted}, " + text[m.end(1) :]
path.write_text(text)
print(f"Patched reset.ts: truncate {quoted}")
PY

echo "ensure-truncate done"
