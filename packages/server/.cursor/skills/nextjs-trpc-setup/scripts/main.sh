#!/usr/bin/env bash
# Orchestrate tRPC foundation install: deps → files → layout → validate.
# Usage: main.sh --root <project> [--force] [--force-install] [--skip-deps] [--files-only] [--layout-only]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
FORCE=false
FORCE_INSTALL=false
SKIP_DEPS=false
FILES_ONLY=false
LAYOUT_ONLY=false

show_help() {
  cat <<EOF
Next.js tRPC foundation setup (literal assets)

Usage:
  $(basename "$0") --root <project> [options]

Options:
  --root <path>       Absolute (or resolvable) Next.js project root with src/
  --force             Overwrite differing destination files
  --force-install     Re-run full canonical bun add even if deps present
  --skip-deps         Skip dependency install step
  --files-only        Copy assets only (skip layout patch; still runs deps unless --skip-deps)
  --layout-only       Patch layout only (skip file copy; still runs deps unless --skip-deps)
  -h, --help          Show this help

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
      shift
      ;;
    --layout-only)
      LAYOUT_ONLY=true
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
if [[ "$FILES_ONLY" == true && "$LAYOUT_ONLY" == true ]]; then
  die "Cannot combine --files-only and --layout-only"
fi

ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

do_files=true
do_layout=true
if [[ "$FILES_ONLY" == true ]]; then
  do_layout=false
fi
if [[ "$LAYOUT_ONLY" == true ]]; then
  do_files=false
fi

if [[ "$SKIP_DEPS" != true ]]; then
  dep_args=(--root "$ROOT")
  if [[ "$FORCE_INSTALL" == true ]]; then
    dep_args+=(--force-install)
  fi
  bash "${SCRIPT_DIR}/install-deps.sh" "${dep_args[@]}"
fi

if [[ "$do_files" == true ]]; then
  force_args=()
  if [[ "$FORCE" == true ]]; then
    force_args=(--force)
  fi
  bash "${SCRIPT_DIR}/install-files.sh" --root "$ROOT" "${force_args[@]}"
fi

if [[ "$do_layout" == true ]]; then
  bash "${SCRIPT_DIR}/patch-layout.sh" --root "$ROOT"
fi

bash "${SCRIPT_DIR}/validate.sh" --root "$ROOT"
