#!/usr/bin/env bash
# Validate that target project matches canonical Drizzle assets + deps + scripts.
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
      echo "Compares installed Drizzle files to assets/ and checks deps/scripts/config."
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
  if [[ ! -e "$dest" ]]; then
    err "missing $dest_rel"
    continue
  fi

  # Post–better-auth: db.ts / schema.ts are intentionally patched; accept variants.
  if [[ "$dest_rel" == "src/lib/db.ts" ]]; then
    if grep -qE 'export[[:space:]]*\{[^}]*\bdb\b[^}]*\}' "$dest"; then
      err "$dest_rel must not named-export db (use only export default db)"
    elif cmp -s "$src" "$dest"; then
      ok "$dest_rel matches asset (bare foundation)"
    elif grep -q 'authRelations' "$dest" && grep -q 'relations: authRelations' "$dest" && grep -qE 'export[[:space:]]+default[[:space:]]+db' "$dest"; then
      ok "$dest_rel has authRelations patch (post better-auth)"
    else
      err "differs from asset and is not a valid authRelations patch: $dest_rel"
    fi
    continue
  fi

  if [[ "$dest_rel" == "src/db/schema.ts" ]]; then
    if cmp -s "$src" "$dest"; then
      ok "$dest_rel matches asset (bare foundation)"
    elif grep -qE 'export[[:space:]]+\*[[:space:]]+from[[:space:]]+["'\'']\./auth/auth-schema["'\'']' "$dest"; then
      ok "$dest_rel re-exports auth-schema (post better-auth)"
    else
      err "differs from asset and does not re-export auth-schema: $dest_rel"
    fi
    continue
  fi

  if ! cmp -s "$src" "$dest"; then
    err "differs from asset: $dest_rel"
    continue
  fi
  ok "$dest_rel matches asset"
done < <(file_map)

if [[ -d "${ROOT}/src/db/scritps" ]]; then
  err "found src/db/scritps — canonical path is src/db/scripts"
fi

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

  while IFS='|' read -r key value; do
    [[ -n "$key" ]] || continue
    if package_json_has_script "$ROOT" "$key" "$value"; then
      ok "package.json script $key"
    else
      err "package.json missing or wrong script: $key (run patch-package-scripts.sh)"
    fi
  done < <(canonical_package_scripts)
fi

if config_has_database_url "$ROOT"; then
  ok "src/lib/config.ts has databaseUrl"
else
  err "src/lib/config.ts missing databaseUrl — add DATABASE_URL via nextjs-env-config (do not rewrite .env)"
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
