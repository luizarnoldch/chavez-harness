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

# SCREAMING_SNAKE → camelCase
to_camel_case() {
  local key="$1"
  local lower
  lower="$(echo "$key" | tr '[:upper:]' '[:lower:]')"
  local result=""
  local part
  local first=true
  IFS='_' read -ra parts <<<"$lower"
  for part in "${parts[@]}"; do
    [[ -n "$part" ]] || continue
    if [[ "$first" == true ]]; then
      result="$part"
      first=false
    else
      result+="$(echo "${part:0:1}" | tr '[:lower:]' '[:upper:]')${part:1}"
    fi
  done
  echo "$result"
}

# True if KEY= appears as a line start in file (ignores comments / blank).
env_file_has_key() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -qE "^[[:space:]]*${key}=" "$file"
}
