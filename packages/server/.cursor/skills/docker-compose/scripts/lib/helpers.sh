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
}

skill_dir_from_scripts() {
  local script_dir="$1"
  cd "${script_dir}/.." && pwd
}

# True if KEY= appears as a line start in file (ignores comments / blank).
env_file_has_key() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -qE "^[[:space:]]*${key}=" "$file"
}

# First top-level compose key at indent 2: "  name:"
extract_yaml_key() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local line
  line="$(grep -E '^  [A-Za-z0-9_-]+:' "$file" | head -n1 || true)"
  [[ -n "$line" ]] || return 1
  # strip leading spaces and trailing colon (+ optional rest)
  line="${line#"${line%%[![:space:]]*}"}"
  echo "${line%%:*}"
}

# List service ids from assets/compose/*.yml (exclude header.yml).
list_service_ids() {
  local compose_dir="$1"
  local f base
  for f in "$compose_dir"/*.yml; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f" .yml)"
    [[ "$base" == "header" ]] && continue
    echo "$base"
  done | sort
}

compose_fragment_path() {
  local skill="$1"
  local id="$2"
  echo "${skill}/assets/compose/${id}.yml"
}

volume_fragment_path() {
  local skill="$1"
  local id="$2"
  echo "${skill}/assets/compose/volumes/${id}.yml"
}

env_fragment_path() {
  local skill="$1"
  local id="$2"
  echo "${skill}/assets/env/${id}.env"
}

validate_service_id() {
  local skill="$1"
  local id="$2"
  local frag
  frag="$(compose_fragment_path "$skill" "$id")"
  [[ -f "$frag" ]] || die "Unknown service '$id' (missing $frag). Run list-services.sh."
}

# True if "  key:" exists as a service/volume entry under compose file.
compose_has_key() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1
  grep -qE "^  ${key}:" "$file"
}

# Substitute {{PROJECT}} in stdin → stdout
render_project() {
  local project="$1"
  sed "s/{{PROJECT}}/${project}/g"
}

# Append KEY=VALUE to file only if KEY missing.
append_env_key() {
  local file="$1"
  local key="$2"
  local value="$3"
  if env_file_has_key "$file" "$key"; then
    echo "$(basename "$file") already has $key — skip"
    return 0
  fi
  touch "$file"
  printf '%s=%s\n' "$key" "$value" >>"$file"
  echo "Appended $key to $(basename "$file")"
}
