#!/usr/bin/env bash
# Mount authRouter on the app router.
# Usage: patch-app-router.sh --root <project>
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
      echo "Usage: patch-app-router.sh --root <project>"
      echo "Adds auth: authRouter to src/trpc/routers/_app.ts"
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

APP="${ROOT}/src/trpc/routers/_app.ts"
[[ -f "$APP" ]] || die "src/trpc/routers/_app.ts missing — run nextjs-trpc-setup first"

if app_router_has_auth "$ROOT"; then
  echo "OK: src/trpc/routers/_app.ts already mounts authRouter"
  exit 0
fi

python3 - "$APP" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
changed = []

import_line = 'import { authRouter } from "@/features/auth/server/auth.router";\n'
if "authRouter" not in text:
    lines = text.splitlines(keepends=True)
    insert_at = 0
    for i, line in enumerate(lines):
        if line.lstrip().startswith("import "):
            insert_at = i + 1
    lines.insert(insert_at, import_line)
    text = "".join(lines)
    changed.append("authRouter import")

# Insert auth: authRouter inside createTRPCRouter({ ... })
if "auth: authRouter" not in text and "auth:authRouter" not in text:
    marker = "createTRPCRouter({"
    if marker not in text:
        print("Error: could not find createTRPCRouter({", file=sys.stderr)
        sys.exit(1)
    # Prefer inserting before the closing `});` of appRouter
    close = text.rfind("});")
    if close < 0:
        print("Error: could not find router close", file=sys.stderr)
        sys.exit(1)
    # Ensure trailing comma on previous procedure if needed
    before = text[:close].rstrip()
    if not before.endswith(",") and not before.endswith("{"):
        before = before + ","
    text = before + "\n  auth: authRouter,\n" + text[close:]
    changed.append("auth: authRouter")

path.write_text(text)
print("Patched _app.ts:", ", ".join(changed) if changed else "no-op")
PY

echo "patch-app-router done"
