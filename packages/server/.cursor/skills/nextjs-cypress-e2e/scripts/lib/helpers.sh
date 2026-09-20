#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "Error: $*" >&2
  exit 1
}

validate_root() {
  local root="$1"
  if [[ ! -d "$root" ]]; then
    die "Target path does not exist: $root"
  fi
  if [[ ! -d "$root/src" ]]; then
    die "Target does not appear to be a Next.js project (no src/ folder): $root"
  fi
}

skill_dir_from_scripts() {
  local script_dir="$1"
  cd "${script_dir}/.." && pwd
}

validate_entity() {
  local entity="$1"
  if [[ -z "$entity" ]]; then
    die "Entity name is required"
  fi
  if [[ ! "$entity" =~ ^[A-Z][a-zA-Z0-9]*$ ]] && [[ ! "$entity" =~ ^[a-z][a-z0-9-]*$ ]]; then
    die "Entity must be PascalCase (Task) or kebab-case (task)"
  fi
}

to_pascal_case() {
  local input="$1"
  if [[ "$input" =~ ^[A-Z] ]]; then
    echo "$input"
  else
    echo "$input" | sed -E 's/(^|[-_])([a-z])/\U\2/g; s/[-_]//g'
  fi
}

to_kebab_case() {
  local input="$1"
  if [[ "$input" =~ ^[a-z] ]]; then
    echo "$input"
  else
    echo "$input" | sed -E 's/([A-Z])/-\L\1/g; s/^-//; s/([a-z])([A-Z])/\1-\L\2/g'
  fi
}

to_camel_case() {
  local input="$1"
  local pascal
  pascal=$(to_pascal_case "$input")
  echo "$pascal" | sed -E 's/^([A-Z])/\L\1/'
}

to_snake_case() {
  local input="$1"
  echo "$input" | sed -E 's/([A-Z])/_\L\1/g; s/^_//; s/([a-z])([A-Z])/\1_\L\2/g; s/-/_/g' | tr '[:upper:]' '[:lower:]'
}

cypress_harness_present() {
  local root="$1"
  [[ -f "${root}/cypress.config.ts" ]] \
    && [[ -f "${root}/cypress/support/selectors.ts" ]] \
    && [[ -f "${root}/cypress/support/commands.ts" ]] \
    && [[ -f "${root}/src/types/import-meta.d.ts" ]]
}

entity_components_present() {
  local root="$1"
  local kebab="$2"
  local pascal="$3"
  [[ -f "${root}/src/features/${kebab}/components/${pascal}List/index.tsx" ]] \
    && [[ -f "${root}/src/features/${kebab}/components/${pascal}FormCreate.tsx" ]] \
    && [[ -f "${root}/src/features/${kebab}/components/${pascal}FormUpdate.tsx" ]]
}

required_data_cy_markers() {
  local kebab="$1"
  cat <<EOF
data-cy-${kebab}-list
data-cy-submit-create-${kebab}-btn
data-cy-submit-create-${kebab}-form
data-cy-create-${kebab}-title-input
data-cy-${kebab}-row
data-cy-${kebab}-title
data-cy-submit-edit-${kebab}-btn
data-cy-submit-delete-${kebab}-btn
data-cy-update-${kebab}-form
data-cy-update-${kebab}-title-input
data-cy-update-${kebab}-submit
EOF
}
