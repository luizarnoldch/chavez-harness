#!/usr/bin/env bash
# Install canonical src/trpc/init.ts with headers context + protectedProcedure.
# Usage: patch-init.sh --root <project> [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ASSET="${SKILL_DIR}/assets/trpc/init.ts"
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
      echo "Usage: patch-init.sh --root <project> [--force]"
      echo "Installs protectedProcedure init.ts from assets."
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
[[ -f "$ASSET" ]] || die "Missing asset: $ASSET"

DEST="${ROOT}/src/trpc/init.ts"
[[ -f "$DEST" ]] || die "src/trpc/init.ts missing — run nextjs-trpc-setup first"

if init_has_protected_procedure "$ROOT" && [[ "$FORCE" != true ]]; then
  if cmp -s "$ASSET" "$DEST"; then
    echo "OK: src/trpc/init.ts already matches auth frontend asset"
    exit 0
  fi
  echo "OK: src/trpc/init.ts already has protectedProcedure (use --force to replace from asset)"
  exit 0
fi

mkdir -p "$(dirname "$DEST")"
cp "$ASSET" "$DEST"
echo "Patched src/trpc/init.ts (protectedProcedure)"
