#!/usr/bin/env bash
# Idempotently wire src/trpc/client.tsx getUrl() to use config.nextPublicAppUrl.
# Run AFTER nextjs-trpc-setup validate PASS. Do NOT re-run trpc validate after this.
# Usage: wire-trpc-client.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""

show_help() {
  cat <<EOF
Wire tRPC client to src/lib/config

Usage:
  $(basename "$0") --root <project>

Idempotent: skips if getUrl already uses config.nextPublicAppUrl.
Requires src/trpc/client.tsx (from nextjs-trpc-setup).

EOF
}

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
      show_help
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>. Run with --help."
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

CLIENT="${ROOT}/src/trpc/client.tsx"
[[ -f "$CLIENT" ]] || die "Missing $CLIENT — run nextjs-trpc-setup first"

if grep -q 'config\.nextPublicAppUrl' "$CLIENT"; then
  echo "client.tsx already wired to config.nextPublicAppUrl — skip"
  exit 0
fi

python3 - "$CLIENT" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

import_line = 'import config from "@/lib/config";\n'
if 'from "@/lib/config"' not in text and "from '@/lib/config'" not in text:
    # Insert after superjson import if present, else after last import
    marker = 'import superjson from "superjson";\n'
    if marker in text:
        text = text.replace(marker, marker + import_line, 1)
    else:
        # fallback: after first line
        lines = text.splitlines(keepends=True)
        insert_at = 0
        for i, line in enumerate(lines):
            if line.startswith("import "):
                insert_at = i + 1
        lines.insert(insert_at, import_line)
        text = "".join(lines)

old_get_url = '''function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  })();
  return `${base}/api/trpc`;
}'''

new_get_url = '''function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    return config.nextPublicAppUrl;
  })();
  return `${base}/api/trpc`;
}'''

if old_get_url not in text:
    # Broader replace: any getUrl that still uses process.env
    import re
    pattern = re.compile(
        r"function getUrl\(\) \{.*?\n\}",
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        print("Error: could not find getUrl() in client.tsx", file=sys.stderr)
        sys.exit(1)
    text = text[: match.start()] + new_get_url + text[match.end() :]
else:
    text = text.replace(old_get_url, new_get_url, 1)

path.write_text(text)
print(f"Wired {path} to config.nextPublicAppUrl")
PY
