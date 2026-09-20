#!/usr/bin/env bash
# Ensure canonical tRPC-related packages are in the target package.json via bun.
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
      echo "Installs missing packages with bun (see reference/deps.md)."
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

if [[ "$FORCE_INSTALL" == true ]]; then
  mapfile -t specs < <(canonical_bun_add_specs)
  echo "Running: bun add ${specs[*]}"
  (cd "$ROOT" && bun add "${specs[@]}")
  echo "install-deps done: force-install"
  exit 0
fi

missing_specs=()
missing_names=()
while IFS= read -r name; do
  [[ -n "$name" ]] || continue
  if package_json_has_dep "$ROOT" "$name"; then
    echo "OK: dep present: $name"
  else
    echo "MISSING: $name"
    missing_names+=("$name")
    missing_specs+=("$(bun_add_spec_for "$name")")
  fi
done < <(required_dep_names)

if [[ ${#missing_specs[@]} -eq 0 ]]; then
  echo "OK: deps present"
  exit 0
fi

echo "Running: bun add ${missing_specs[*]}"
(cd "$ROOT" && bun add "${missing_specs[@]}")
echo "install-deps done: installed ${missing_names[*]}"
