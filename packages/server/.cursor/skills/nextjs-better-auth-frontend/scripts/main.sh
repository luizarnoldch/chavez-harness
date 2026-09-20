#!/usr/bin/env bash
# Orchestrate better-auth frontend: files → patch init → patch app router → validate.
# Usage: main.sh --root <project> [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
FORCE=false

show_help() {
  cat <<EOF
Next.js better-auth frontend setup (UI + tRPC auth + proxy)

Usage:
  $(basename "$0") --root <project> [options]

Options:
  --root <path>   Absolute (or resolvable) Next.js project root with src/
  --force         Overwrite differing destination files / replace init.ts
  -h, --help      Show this help

Order: install-files → patch-init → patch-app-router → validate.

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
  || die "Prerequisites missing — run nextjs-trpc-setup, nextjs-better-auth-setup first"
config_has_better_auth "$ROOT" \
  || die "config.betterAuth* missing — run nextjs-better-auth-setup sync-env first"

force_args=()
if [[ "$FORCE" == true ]]; then
  force_args=(--force)
fi

bash "${SCRIPT_DIR}/install-files.sh" --root "$ROOT" "${force_args[@]}"
bash "${SCRIPT_DIR}/patch-init.sh" --root "$ROOT" "${force_args[@]}"
bash "${SCRIPT_DIR}/patch-app-router.sh" --root "$ROOT"
bash "${SCRIPT_DIR}/validate.sh" --root "$ROOT"
