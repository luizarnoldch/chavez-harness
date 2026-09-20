#!/usr/bin/env bash
# Idempotently inject TRPCReactProvider into src/app/layout.tsx.
# Usage: patch-layout.sh --root <project>
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
      echo "Usage: patch-layout.sh --root <project>"
      echo "Adds import + TRPCReactProvider wrap around children if missing."
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

LAYOUT="${ROOT}/src/app/layout.tsx"
[[ -f "$LAYOUT" ]] || die "layout.tsx not found: $LAYOUT"

if layout_has_provider "$LAYOUT" && layout_has_import "$LAYOUT"; then
  echo "OK: layout already has TRPCReactProvider import + usage"
  exit 0
fi

# Use Python for reliable, minimal AST-free text surgery on TSX.
python3 - "$LAYOUT" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

import_line = 'import { TRPCReactProvider } from "@/trpc/client";\n'

has_import = bool(re.search(r'from\s+["\']@/trpc/client["\']', text))
has_provider = "TRPCReactProvider" in text

if has_import and has_provider and re.search(r"<TRPCReactProvider[\s>]", text):
    print("OK: layout already wired")
    sys.exit(0)

# Add import after last import block if missing
if not has_import:
    # Find last consecutive import at top (after optional "use client" / comments)
    lines = text.splitlines(keepends=True)
    insert_at = 0
    i = 0
    # skip shebang / use client / blank / comments at start
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith('"use ') or s.startswith("'use ") or s.startswith("//") or s.startswith("/*") or s == "":
            i += 1
            continue
        break
    # walk import statements (including multi-line)
    while i < len(lines):
        s = lines[i].lstrip()
        if s.startswith("import "):
            # consume until semicolon or end of statement
            while i < len(lines) and ";" not in lines[i]:
                i += 1
            i += 1
            insert_at = i
            continue
        break
    lines.insert(insert_at, import_line)
    text = "".join(lines)
    print("Added TRPCReactProvider import")

# Wrap {children} if provider JSX missing
if not re.search(r"<TRPCReactProvider[\s>]", text):
    # Prefer wrapping the expression {children} once inside body/return.
    # Avoid wrapping LayoutProps destructuring children.
    pattern = r"(\{children\})"
    matches = list(re.finditer(pattern, text))
    if not matches:
        print("Error: could not find {children} to wrap", file=sys.stderr)
        sys.exit(1)
    # Use the last {children} — typically JSX, not the props type
    m = matches[-1]
    start, end = m.span()
    text = text[:start] + "<TRPCReactProvider>{children}</TRPCReactProvider>" + text[end:]
    print("Wrapped {children} with TRPCReactProvider")

path.write_text(text)
print(f"Patched: {path}")
PY
