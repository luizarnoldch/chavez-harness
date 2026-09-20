#!/usr/bin/env bash
# Ensure cypress is in package.json via bun.
# Usage: install-deps.sh --root <project> [--force-install]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
FORCE_INSTALL=false

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
    --force-install)
      FORCE_INSTALL=true
      shift
      ;;
    --help|-h)
      echo "Usage: install-deps.sh --root <project> [--force-install]"
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

PKG="${ROOT}/package.json"
[[ -f "$PKG" ]] || die "package.json not found: $PKG"
command -v bun >/dev/null 2>&1 || die "bun is required but not on PATH"

run_canonical_adds() {
  echo "Running: bun add -d cypress"
  (cd "$ROOT" && bun add -d cypress)
}

if [[ "$FORCE_INSTALL" == true ]]; then
  run_canonical_adds
  echo "install-deps done: force-install"
  exit 0
fi

missing=()
while IFS= read -r name; do
  [[ -n "$name" ]] || continue
  if package_json_has_dep "$ROOT" "$name"; then
    echo "OK: dep present: $name"
  else
    echo "MISSING: $name"
    missing+=("$name")
  fi
done < <(required_dep_names)

if [[ ${#missing[@]} -eq 0 ]]; then
  echo "OK: deps present"
  exit 0
fi

run_canonical_adds
echo "install-deps done: installed missing (${missing[*]})"
