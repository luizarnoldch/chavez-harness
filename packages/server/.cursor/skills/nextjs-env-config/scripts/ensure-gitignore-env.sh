#!/usr/bin/env bash
# Ensure .gitignore ignores .env* but allows *.example (e.g. .env.example).
# Usage: ensure-gitignore-env.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""

show_help() {
  cat <<EOF
Ensure env ignore rules in .gitignore

Usage:
  $(basename "$0") --root <project>

Adds (idempotent):
  .env*
  !*.example

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

GI="${ROOT}/.gitignore"
if [[ ! -f "$GI" ]]; then
  cat >>"$GI" <<'EOF'
# env files (can opt-in for committing if needed)
.env*
!*.example
EOF
  echo "Created .gitignore with env ignore rules"
  exit 0
fi

needs_env_star=true
needs_example=true
grep -qE '^\.env\*' "$GI" && needs_env_star=false
grep -qE '^!\*\.example$' "$GI" && needs_example=false

if [[ "$needs_env_star" == false && "$needs_example" == false ]]; then
  echo "gitignore env rules already present"
  exit 0
fi

{
  echo ""
  echo "# env files (can opt-in for committing if needed)"
  [[ "$needs_env_star" == true ]] && echo ".env*"
  [[ "$needs_example" == true ]] && echo "!*.example"
} >>"$GI"

echo "Appended missing env ignore rules to .gitignore"
