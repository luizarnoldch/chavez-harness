#!/usr/bin/env bash
# Copy canonical tRPC assets into a Next.js project root (byte-for-byte).
# Usage: install-files.sh --root <project> [--force]
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
      echo "Usage: install-files.sh --root <project> [--force]"
      echo "Copies assets/trpc/* and assets/app/api/trpc/[trpc]/route.ts into the target."
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
[[ -d "$ASSETS_DIR" ]] || die "Assets directory missing: $ASSETS_DIR"

copied=0
skipped=0

while IFS='|' read -r asset_rel dest_rel; do
  [[ -n "$asset_rel" ]] || continue
  src="${ASSETS_DIR}/${asset_rel}"
  dest="${ROOT}/${dest_rel}"
  [[ -f "$src" ]] || die "Missing asset: $src"

  if [[ -e "$dest" ]] && [[ "$FORCE" != true ]]; then
    if cmp -s "$src" "$dest"; then
      echo "OK (identical): $dest_rel"
      skipped=$((skipped + 1))
      continue
    fi
    die "Refusing to overwrite differing file (use --force): $dest_rel"
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "Copied: $dest_rel"
  copied=$((copied + 1))
done < <(file_map)

echo "install-files done: copied=$copied identical_or_skipped=$skipped"
