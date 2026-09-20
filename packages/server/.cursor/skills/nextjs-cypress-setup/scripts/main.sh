#!/usr/bin/env bash
# Orchestrate Cypress harness: deps → files → patches → validate.
# Usage: main.sh --root <project> [--force] [--force-install] [--skip-deps] [--files-only]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
FORCE=false
FORCE_INSTALL=false
SKIP_DEPS=false
FILES_ONLY=false

show_help() {
  cat <<EOF
Next.js Cypress e2e harness setup

Usage:
  $(basename "$0") --root <project> [options]

Options:
  --root <path>       Absolute Next.js project root with src/
  --force             Overwrite differing Cypress asset files
  --force-install     Re-run bun add -d cypress
  --skip-deps         Skip dependency install
  --files-only        Copy assets + patches only (still validates)
  -h, --help          Show this help

Order: deps → files → package scripts → gitignore → db scripts → auth data-cy → validate.

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
    --force)
      FORCE=true
      shift
      ;;
    --force-install)
      FORCE_INSTALL=true
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --files-only)
      FILES_ONLY=true
      SKIP_DEPS=true
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

better_auth_foundation_present "$ROOT" \
  || die "better-auth foundation missing — run nextjs-better-auth-setup first"
auth_forms_present "$ROOT" \
  || die "auth forms missing — run nextjs-better-auth-frontend first"
db_scripts_present "$ROOT" \
  || die "src/db/scripts/{reset,seed}.ts missing — run nextjs-drizzle-setup first"

if [[ "$SKIP_DEPS" != true ]]; then
  dep_args=(--root "$ROOT")
  if [[ "$FORCE_INSTALL" == true ]]; then
    dep_args+=(--force-install)
  fi
  bash "${SCRIPT_DIR}/install-deps.sh" "${dep_args[@]}"
fi

force_args=()
if [[ "$FORCE" == true ]]; then
  force_args=(--force)
fi

bash "${SCRIPT_DIR}/install-files.sh" --root "$ROOT" "${force_args[@]}"
bash "${SCRIPT_DIR}/patch-package-scripts.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/patch-gitignore.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/patch-db-scripts.sh" --root "$ROOT" "${force_args[@]}"
bash "${SCRIPT_DIR}/patch-auth-data-cy.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/validate.sh" --root "$ROOT"

echo "nextjs-cypress-setup complete. Next: nextjs-cypress-e2e for entity CRUD specs."
