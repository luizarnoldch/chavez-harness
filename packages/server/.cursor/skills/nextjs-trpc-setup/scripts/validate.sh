#!/usr/bin/env bash
# Validate that target project matches canonical tRPC assets + layout wiring.
# Usage: validate.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ASSETS_DIR="${SKILL_DIR}/assets"
ROOT=""

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
      echo "Usage: validate.sh --root <project>"
      echo "Compares installed tRPC files to assets/ and checks layout provider."
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

ERRORS=0
err() {
  echo "FAIL: $*" >&2
  ERRORS=$((ERRORS + 1))
}
ok() {
  echo "OK: $*"
}

while IFS='|' read -r asset_rel dest_rel; do
  [[ -n "$asset_rel" ]] || continue
  src="${ASSETS_DIR}/${asset_rel}"
  dest="${ROOT}/${dest_rel}"
  if [[ ! -f "$dest" ]]; then
    err "missing $dest_rel"
    continue
  fi
  if ! cmp -s "$src" "$dest"; then
    err "differs from asset: $dest_rel"
    continue
  fi
  ok "$dest_rel matches asset"
done < <(file_map)

LAYOUT="${ROOT}/src/app/layout.tsx"
if [[ ! -f "$LAYOUT" ]]; then
  err "missing src/app/layout.tsx"
else
  if layout_has_import "$LAYOUT"; then
    ok "layout imports @/trpc/client"
  else
    err "layout missing import from @/trpc/client"
  fi
  if grep -qE '<TRPCReactProvider[\s>]' "$LAYOUT"; then
    ok "layout wraps with <TRPCReactProvider>"
  else
    err "layout missing <TRPCReactProvider> JSX"
  fi
fi

# Canonical path is src/app/api/trpc (aligned with endpoint /api/trpc)
if [[ -f "${ROOT}/src/app/trpc/[trpc]/route.ts" ]]; then
  err "found src/app/trpc/[trpc]/route.ts — canonical route is src/app/api/trpc/[trpc]/route.ts"
fi

# Required packages in package.json
if [[ ! -f "${ROOT}/package.json" ]]; then
  err "missing package.json"
else
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    if package_json_has_dep "$ROOT" "$name"; then
      ok "package.json has $name"
    else
      err "package.json missing dependency: $name (run install-deps.sh)"
    fi
  done < <(required_dep_names)
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
