#!/usr/bin/env bash
# Generate cypress/e2e/[entity]s.cy.ts from template.
# Usage: generate-spec.sh --root <project> --entity <Entity> [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"
# shellcheck source=lib/replacer.sh
source "${SCRIPT_DIR}/lib/replacer.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ROOT=""
ENTITY=""
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
    --entity)
      [[ $# -ge 2 ]] || die "--entity requires a name"
      ENTITY="$2"
      shift 2
      ;;
    --entity=*)
      ENTITY="${1#--entity=}"
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      echo "Usage: generate-spec.sh --root <project> --entity <Entity> [--force]"
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

CAMEL=$(to_camel_case "$ENTITY")
OUT="${ROOT}/cypress/e2e/${CAMEL}s.cy.ts"
TPL="${SKILL_DIR}/assets/templates/entity.cy.ts"
[[ -f "$TPL" ]] || die "Missing template: $TPL"

if [[ -e "$OUT" ]] && [[ "$FORCE" != true ]]; then
  if cmp -s <(replace_placeholders "$(cat "$TPL")" "$ENTITY") "$OUT"; then
    echo "OK (identical): cypress/e2e/${CAMEL}s.cy.ts"
    exit 0
  fi
  die "Refusing to overwrite differing spec (use --force): cypress/e2e/${CAMEL}s.cy.ts"
fi

mkdir -p "$(dirname "$OUT")"
replace_placeholders "$(cat "$TPL")" "$ENTITY" > "$OUT"
echo "Wrote: cypress/e2e/${CAMEL}s.cy.ts"
echo "generate-spec done"
