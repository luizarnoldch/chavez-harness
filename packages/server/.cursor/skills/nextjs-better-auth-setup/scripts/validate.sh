#!/usr/bin/env bash
# Validate better-auth foundation: assets, deps, scripts, db/schema wiring, env.
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
      echo "Compares auth files to assets/ and checks deps/scripts/wiring/env."
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
  if ! cmp -s "$src" "$dest"; then
    err "differs from asset: $dest_rel"
    continue
  fi
  ok "$dest_rel matches asset"
done < <(file_map)

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

  if package_json_has_type_module "$ROOT"; then
    ok 'package.json has "type": "module"'
  else
    err 'package.json missing "type": "module" (run patch-package-scripts.sh)'
  fi
fi

if db_has_auth_relations "$ROOT"; then
  ok "src/lib/db.ts has authRelations + export default db (no named export)"
else
  err "src/lib/db.ts missing authRelations wiring or still named-exports db (run patch-db.sh)"
fi

if schema_exports_auth "$ROOT"; then
  ok "src/db/schema.ts exports auth-schema"
else
  err "src/db/schema.ts missing auth-schema export (run patch-schema.sh)"
fi

if config_has_next_public_app_url "$ROOT"; then
  ok "src/lib/config.ts has nextPublicAppUrl"
else
  err "src/lib/config.ts missing nextPublicAppUrl — bootstrap via nextjs-env-config"
fi

if config_has_better_auth_keys "$ROOT"; then
  ok "src/lib/config.ts has betterAuthSecret + betterAuthUrl"
else
  err "src/lib/config.ts missing betterAuth* — run sync-env.sh (add-env-var via nextjs-env-config)"
fi

if env_example_has_key "$ROOT" "BETTER_AUTH_SECRET"; then
  ok ".env.example has BETTER_AUTH_SECRET"
else
  err ".env.example missing BETTER_AUTH_SECRET (run sync-env.sh)"
fi

if env_example_has_key "$ROOT" "BETTER_AUTH_URL"; then
  ok ".env.example has BETTER_AUTH_URL"
else
  err ".env.example missing BETTER_AUTH_URL (run sync-env.sh)"
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
