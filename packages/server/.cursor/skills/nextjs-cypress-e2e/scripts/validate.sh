#!/usr/bin/env bash
# Validate entity e2e artifacts.
# Usage: validate.sh --root <project> --entity <Entity>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
ENTITY=""

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
    --entity)
      [[ $# -ge 2 ]] || die "--entity requires a name"
      ENTITY="$2"
      shift 2
      ;;
    --entity=*)
      ENTITY="${1#--entity=}"
      shift
      ;;
    --help|-h)
      echo "Usage: validate.sh --root <project> --entity <Entity>"
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
[[ -n "$ENTITY" ]] || die "Missing --entity <Entity>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"
validate_entity "$ENTITY"

KEBAB=$(to_kebab_case "$ENTITY")
PASCAL=$(to_pascal_case "$ENTITY")
CAMEL=$(to_camel_case "$ENTITY")
TABLE=$(to_snake_case "$ENTITY")

ERRORS=0
err() {
  echo "FAIL: $*" >&2
  ERRORS=$((ERRORS + 1))
}
ok() {
  echo "OK: $*"
}

cypress_harness_present "$ROOT" || err "Cypress harness missing — run nextjs-cypress-setup"
entity_components_present "$ROOT" "$KEBAB" "$PASCAL" \
  || err "entity components missing for ${PASCAL}"

SPEC="${ROOT}/cypress/e2e/${CAMEL}s.cy.ts"
if [[ -f "$SPEC" ]]; then
  ok "spec exists: cypress/e2e/${CAMEL}s.cy.ts"
else
  err "missing spec: cypress/e2e/${CAMEL}s.cy.ts"
fi

SEL="${ROOT}/cypress/support/selectors.ts"
if [[ -f "$SEL" ]] && grep -qE "^  ${CAMEL}s:" "$SEL"; then
  ok "selectors has ${CAMEL}s block"
else
  err "selectors.ts missing ${CAMEL}s block"
fi

LIST="${ROOT}/src/features/${KEBAB}/components/${PASCAL}List/index.tsx"
CREATE="${ROOT}/src/features/${KEBAB}/components/${PASCAL}FormCreate.tsx"
UPDATE="${ROOT}/src/features/${KEBAB}/components/${PASCAL}FormUpdate.tsx"

while IFS= read -r marker; do
  [[ -n "$marker" ]] || continue
  found=false
  for f in "$LIST" "$CREATE" "$UPDATE"; do
    if [[ -f "$f" ]] && grep -q "$marker" "$f"; then
      found=true
      break
    fi
  done
  if [[ "$found" == true ]]; then
    ok "data-cy marker: $marker"
  else
    err "missing data-cy marker: $marker"
  fi
done < <(required_data_cy_markers "$KEBAB")

RESET="${ROOT}/src/db/scripts/reset.ts"
if [[ -f "$RESET" ]] && grep -q "\"${TABLE}\"" "$RESET"; then
  ok "reset.ts truncates \"${TABLE}\""
else
  err "reset.ts missing truncate for \"${TABLE}\""
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
