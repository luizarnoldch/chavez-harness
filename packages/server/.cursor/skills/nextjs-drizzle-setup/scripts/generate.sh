#!/usr/bin/env bash
# Run drizzle-kit generate in the target project.
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
      echo "Runs: bunx drizzle-kit generate"
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

[[ -f "${ROOT}/drizzle.config.ts" ]] || die "drizzle.config.ts missing — run install-files.sh first"
command -v bun >/dev/null 2>&1 || die "bun is required but not on PATH"

echo "Running: bunx drizzle-kit generate"
(cd "$ROOT" && bunx drizzle-kit generate)
echo "generate done"
