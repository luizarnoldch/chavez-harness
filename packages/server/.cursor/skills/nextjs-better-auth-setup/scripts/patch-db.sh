#!/usr/bin/env bash
# Idempotently wire authRelations into src/lib/db.ts.
# Usage: patch-db.sh --root <project>
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
      echo "Usage: patch-db.sh --root <project>"
      echo "Adds authRelations import, drizzle relations option, and export default db."
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

DB="${ROOT}/src/lib/db.ts"
[[ -f "$DB" ]] || die "src/lib/db.ts missing — run nextjs-drizzle-setup first"

if db_has_auth_relations "$ROOT"; then
  echo "OK: src/lib/db.ts already has authRelations + export default db"
  exit 0
fi

python3 - "$DB" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
changed = []

import_line = 'import { authRelations } from "@/db/auth/auth-schema";\n'

if "authRelations" not in text:
    lines = text.splitlines(keepends=True)
    insert_at = 0
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith('"use ') or s.startswith("'use ") or s.startswith("//") or s.startswith("/*") or s == "":
            i += 1
            continue
        break
    while i < len(lines):
        s = lines[i].lstrip()
        if s.startswith("import "):
            while i < len(lines) and ";" not in lines[i]:
                i += 1
            i += 1
            insert_at = i
            continue
        break
    # Prefer after dotenv/config if present
    for idx, line in enumerate(lines):
        if 'dotenv/config' in line:
            insert_at = idx + 1
            break
    lines.insert(insert_at, import_line)
    text = "".join(lines)
    changed.append("authRelations import")

# Ensure drizzle({ client: pool, relations: authRelations })
if "relations: authRelations" not in text:
    # Match drizzle({ client: pool }) with optional whitespace / trailing comma
    new_text, n = re.subn(
        r"drizzle\(\s*\{\s*client:\s*pool\s*,?\s*\}\s*\)",
        "drizzle({ client: pool, relations: authRelations })",
        text,
        count=1,
    )
    if n == 0:
        print(
            "Error: could not find drizzle({ client: pool }) to patch",
            file=sys.stderr,
        )
        sys.exit(1)
    text = new_text
    changed.append("drizzle relations")

# Ensure export default db
if not re.search(r"export\s+default\s+db\b", text):
    # If `const db = ...` or `export const db` — normalize to default export
    if re.search(r"export\s+const\s+db\b", text):
        text = re.sub(r"export\s+const\s+db\b", "const db", text, count=1)
        changed.append("demote export const db")
    if not text.rstrip().endswith("export default db;"):
        text = text.rstrip() + "\n\nexport default db;\n"
        changed.append("export default db")

# Remove redundant named export of db (default-only convention)
named = re.compile(r"(?m)^export\s*\{[^}]*\bdb\b[^}]*\}\s*;?\s*\n?")
if named.search(text):
    text = named.sub("", text)
    changed.append("remove named export { db }")
    if not re.search(r"export\s+default\s+db\b", text):
        text = text.rstrip() + "\n\nexport default db;\n"
        changed.append("export default db")

path.write_text(text)
print("Patched src/lib/db.ts:", ", ".join(changed) if changed else "no-op")
PY

echo "patch-db done"
