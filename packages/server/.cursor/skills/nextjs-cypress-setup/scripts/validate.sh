#!/usr/bin/env bash
# Validate Cypress harness against assets and wiring.
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
  if [[ "$dest_rel" == "cypress/support/selectors.ts" ]]; then
    if grep -q 'signUpForm' "$dest" && grep -q 'signInForm' "$dest"; then
      ok "$dest_rel has auth selectors"
    else
      err "$dest_rel missing auth selectors"
    fi
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
      err "package.json missing dependency: $name"
    fi
  done < <(required_dep_names)

  while IFS='|' read -r key value; do
    [[ -n "$key" ]] || continue
    if package_json_has_script "$ROOT" "$key" "$value"; then
      ok "package.json script $key"
    else
      err "package.json missing or wrong script: $key"
    fi
  done < <(canonical_package_scripts)
fi

if gitignore_has_cypress "$ROOT"; then
  ok ".gitignore has Cypress entries"
else
  err ".gitignore missing Cypress entries"
fi

if db_reset_is_callable "$ROOT"; then
  ok "src/db/scripts/reset.ts is callable"
else
  err "src/db/scripts/reset.ts not e2e-ready"
fi

if db_seed_is_callable "$ROOT"; then
  ok "src/db/scripts/seed.ts is callable"
else
  err "src/db/scripts/seed.ts not e2e-ready"
fi

if auth_forms_have_data_cy "$ROOT"; then
  ok "auth forms have data-cy attributes"
else
  err "auth forms missing data-cy (run patch-auth-data-cy.sh)"
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
