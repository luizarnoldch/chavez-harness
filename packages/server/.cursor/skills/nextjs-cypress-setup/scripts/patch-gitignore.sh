#!/usr/bin/env bash
# Append Cypress ignore entries to .gitignore.
# Usage: patch-gitignore.sh --root <project>
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
      echo "Usage: patch-gitignore.sh --root <project>"
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

GI="${ROOT}/.gitignore"
if [[ ! -f "$GI" ]]; then
  touch "$GI"
fi

if gitignore_has_cypress "$ROOT"; then
  echo "OK: .gitignore already has Cypress entries"
  exit 0
fi

cat >> "$GI" <<'EOF'

# cypress
/cypress/videos
/cypress/screenshots
/cypress/downloads
EOF

echo "Updated .gitignore with Cypress entries"
echo "patch-gitignore done"
