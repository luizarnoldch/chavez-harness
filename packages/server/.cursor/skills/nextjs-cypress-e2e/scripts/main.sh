#!/usr/bin/env bash
# Generate entity CRUD e2e: data-cy → selectors → spec → truncate → validate.
# Usage: main.sh --root <project> --entity <Entity> [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
ENTITY=""
FORCE=false

show_help() {
  cat <<EOF
Next.js Cypress entity e2e generator

Usage:
  $(basename "$0") --root <project> --entity <Entity> [options]

Options:
  --root <path>       Absolute Next.js project root with src/
  --entity <name>     PascalCase or kebab-case entity (Task, task)
  --force             Overwrite differing generated spec
  -h, --help          Show this help

Order: ensure-data-cy → merge-selectors → generate-spec → ensure-truncate → validate.

EOF
}

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
      show_help
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>. Run with --help."
[[ -n "$ENTITY" ]] || die "Missing --entity <Entity>. Run with --help."

ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"
validate_entity "$ENTITY"

KEBAB=$(to_kebab_case "$ENTITY")
PASCAL=$(to_pascal_case "$ENTITY")

cypress_harness_present "$ROOT" \
  || die "Cypress harness missing — run nextjs-cypress-setup first"
entity_components_present "$ROOT" "$KEBAB" "$PASCAL" \
  || die "Frontend components missing for ${PASCAL} — run nextjs-frontend-scaffolding first"

force_args=()
if [[ "$FORCE" == true ]]; then
  force_args=(--force)
fi

bash "${SCRIPT_DIR}/ensure-data-cy.sh" --root "$ROOT" --entity "$ENTITY"
bash "${SCRIPT_DIR}/merge-selectors.sh" --root "$ROOT" --entity "$ENTITY"
bash "${SCRIPT_DIR}/generate-spec.sh" --root "$ROOT" --entity "$ENTITY" "${force_args[@]}"
bash "${SCRIPT_DIR}/ensure-truncate.sh" --root "$ROOT" --entity "$ENTITY"
bash "${SCRIPT_DIR}/validate.sh" --root "$ROOT" --entity "$ENTITY"

echo "nextjs-cypress-e2e complete for ${PASCAL}."
