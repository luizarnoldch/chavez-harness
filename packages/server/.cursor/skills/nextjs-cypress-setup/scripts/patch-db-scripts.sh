#!/usr/bin/env bash
# Install e2e-ready reset/seed when stubs are empty or --force.
# Usage: patch-db-scripts.sh --root <project> [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ASSETS_DIR="${SKILL_DIR}/assets"
ROOT=""
FORCE=false

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
      echo "Usage: patch-db-scripts.sh --root <project> [--force]"
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

is_empty_stub() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  # Empty stub: only dotenv + empty main, no resetDatabase/seedDatabase export
  if grep -qE 'export async function (reset|seed)Database' "$f"; then
    return 1
  fi
  return 0
}

copy_patch() {
  local name="$1"
  local src="${ASSETS_DIR}/patches/db/${name}"
  local dest="${ROOT}/src/db/scripts/${name}"
  [[ -e "$src" ]] || die "Missing patch asset: $src"
  mkdir -p "$(dirname "$dest")"

  if [[ -e "$dest" ]] && [[ "$FORCE" != true ]]; then
    if ! is_empty_stub "$dest"; then
      echo "SKIP (already implemented): src/db/scripts/${name}"
      return 0
    fi
  fi

  cp "$src" "$dest"
  echo "Copied: src/db/scripts/${name}"
}

copy_patch "reset.ts"
copy_patch "seed.ts"
echo "patch-db-scripts done"
