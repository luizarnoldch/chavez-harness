#!/usr/bin/env bash
# Regenerate Drizzle auth schema via better-auth CLI (optional; asset is canonical).
# Usage: generate.sh --root <project>
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
      echo "Usage: generate.sh --root <project>"
      echo "Runs: bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y"
      echo "Note: output may diverge from assets/; re-capture asset if validate fails."
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

[[ -f "${ROOT}/src/lib/auth/index.ts" ]] || die "src/lib/auth/index.ts missing — run install-files.sh first"
command -v bun >/dev/null 2>&1 || die "bun is required but not on PATH"

mkdir -p "${ROOT}/src/db/auth"
echo "Running: bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y"
(cd "$ROOT" && bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y)
echo "generate done"
echo "WARNING: regenerated schema may differ from skill assets/. Re-copy asset or re-run install-files --force if validate fails."
