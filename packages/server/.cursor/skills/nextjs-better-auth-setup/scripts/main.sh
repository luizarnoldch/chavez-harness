#!/usr/bin/env bash
# Orchestrate better-auth foundation: deps → files → patches → env → [generate] → validate.
# Usage: main.sh --root <project> [--force] [--force-install] [--skip-deps] [--files-only] [--skip-generate] [--force-generate]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
FORCE=false
FORCE_INSTALL=false
SKIP_DEPS=false
FILES_ONLY=false
SKIP_GENERATE=true
FORCE_GENERATE=false

show_help() {
  cat <<EOF
Next.js better-auth foundation setup (literal assets + drizzle adapter)

Usage:
  $(basename "$0") --root <project> [options]

Options:
  --root <path>       Absolute (or resolvable) Next.js project root with src/
  --force             Overwrite differing destination files
  --force-install     Re-run full canonical bun add even if deps present
  --skip-deps         Skip dependency install step
  --files-only        Copy assets + patches + env only (skip generate)
  --skip-generate     Skip auth schema generate (default)
  --force-generate    Run bunx auth generate (may diverge from assets/)
  -h, --help          Show this help

Default order: deps → files → patch-db → patch-schema → package scripts → sync env → validate.
Generate is skipped unless --force-generate (canonical schema is the asset snapshot).

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
      SKIP_GENERATE=true
      FORCE_GENERATE=false
      shift
      ;;
    --skip-generate)
      SKIP_GENERATE=true
      FORCE_GENERATE=false
      shift
      ;;
    --force-generate)
      FORCE_GENERATE=true
      SKIP_GENERATE=false
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

[[ -f "${ROOT}/src/lib/db.ts" ]] || die "src/lib/db.ts missing — run nextjs-drizzle-setup first"
[[ -f "${ROOT}/src/lib/config.ts" ]] || die "src/lib/config.ts missing — run nextjs-env-config first"

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
bash "${SCRIPT_DIR}/patch-db.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/patch-schema.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/patch-package-scripts.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/sync-env.sh" --root "$ROOT"

if [[ "$FORCE_GENERATE" == true ]] && [[ "$SKIP_GENERATE" != true ]]; then
  bash "${SCRIPT_DIR}/generate.sh" --root "$ROOT"
fi

bash "${SCRIPT_DIR}/validate.sh" --root "$ROOT"
