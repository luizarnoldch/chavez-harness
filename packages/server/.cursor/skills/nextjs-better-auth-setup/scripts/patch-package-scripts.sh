#!/usr/bin/env bash
# Ensure package.json has auth:generate script and "type": "module".
# Usage: patch-package-scripts.sh --root <project>
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
      echo "Usage: patch-package-scripts.sh --root <project>"
      echo "Adds auth:generate script and ensures type=module."
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

PKG="${ROOT}/package.json"
[[ -f "$PKG" ]] || die "package.json not found: $PKG"

python3 - "$PKG" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open() as f:
    data = json.load(f)

changed = []

if data.get("type") != "module":
    data["type"] = "module"
    changed.append("type=module")

scripts = data.setdefault("scripts", {})
wanted = {
    "auth:generate": "bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y",
}
for key, value in wanted.items():
    if scripts.get(key) != value:
        scripts[key] = value
        changed.append(key)

if not changed:
    print("OK: package.json already canonical for better-auth")
    sys.exit(0)

with path.open("w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

print("Updated package.json:", ", ".join(changed))
PY

echo "patch-package-scripts done"
