#!/usr/bin/env bash
# Shared helpers for prd-authoring skill scripts.
# shellcheck shell=bash

TASKS_REL="features/tasks"
VALID_KINDS="prd|ticket"
VALID_TYPES="backend-scaffold|frontend-scaffold|backend-review|frontend-review|nextjs-init|nextjs-db-setup|nextjs-better-auth-setup|nextjs-better-auth-frontend|nextjs-cypress-setup|nextjs-cypress-e2e"
VALID_LAYERS="schema|server|hooks|all"
VALID_TRANSPORT="trpc|api"
VALID_DATABASE="prisma|drizzle"
VALID_FLAGS="--all|--page list|--view|--view-full"
VALID_EXECUTION="sequential|parallel"
KNOWN_SKILLS="nextjs-backend-scaffolding|nextjs-frontend-scaffolding|nextjs-backend-scaffolding-reviewer|nextjs-frontend-scaffolding-reviewer|nextjs-trpc-setup|nextjs-drizzle-setup|nextjs-better-auth-setup|nextjs-better-auth-frontend|nextjs-cypress-setup|nextjs-cypress-e2e"

JQ_RELEASE_TAG="jq-1.8.1"
JQ_RELEASE_BASE="https://github.com/jqlang/jq/releases/download/${JQ_RELEASE_TAG}"

die() {
  local code=1
  if [[ "${1:-}" =~ ^[0-9]+$ ]] && [[ $# -ge 2 ]]; then
    code="$1"
    shift
  fi
  echo "Error: $*" >&2
  exit "$code"
}

prd_root() {
  echo "${PRD_ROOT:-$(pwd)}"
}

skill_dir() {
  echo "${PRD_SKILL_DIR:?PRD_SKILL_DIR is not set}"
}

tasks_dir() {
  echo "$(prd_root)/${TASKS_REL}"
}

utc_date() {
  date -u +"%Y-%m-%d"
}

to_pascal_case() {
  local input="$1"
  if [[ "$input" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
    echo "$input"
  else
    echo "$input" | sed -E 's/(^|[-_])([a-z])/\U\2/g; s/[-_]//g'
  fi
}

to_kebab_case() {
  local input="$1"
  if [[ "$input" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "$input"
  else
    echo "$input" | sed -E 's/([A-Z])/-\L\1/g; s/^-//'
  fi
}

to_camel_case() {
  local input="$1"
  local pascal
  pascal="$(to_pascal_case "$input")"
  echo "$pascal" | sed -E 's/^([A-Z])/\L\1/'
}

title_from_slug() {
  local slug="$1" entity="$2" type="$3"
  local label=""
  case "$type" in
    backend-scaffold) label="Backend scaffold" ;;
    frontend-scaffold) label="Frontend scaffold" ;;
    backend-review) label="Backend review" ;;
    frontend-review) label="Frontend review" ;;
    nextjs-init)
      echo "Next.js project init"
      return
      ;;
    nextjs-db-setup)
      echo "Next.js Drizzle database setup"
      return
      ;;
    nextjs-better-auth-setup)
      echo "Next.js better-auth foundation setup"
      return
      ;;
    nextjs-better-auth-frontend)
      echo "Next.js better-auth frontend setup"
      return
      ;;
    nextjs-cypress-setup)
      echo "Next.js Cypress harness setup"
      return
      ;;
    nextjs-cypress-e2e)
      echo "${entity} — Cypress e2e"
      return
      ;;
  esac
  echo "${entity} — ${label}"
}

skill_name_for_type() {
  local type="$1"
  case "$type" in
    backend-scaffold) echo "nextjs-backend-scaffolding" ;;
    frontend-scaffold) echo "nextjs-frontend-scaffolding" ;;
    backend-review) echo "nextjs-backend-scaffolding-reviewer" ;;
    frontend-review) echo "nextjs-frontend-scaffolding-reviewer" ;;
    nextjs-init) echo "nextjs-trpc-setup" ;;
    nextjs-db-setup) echo "nextjs-drizzle-setup" ;;
    nextjs-better-auth-setup) echo "nextjs-better-auth-setup" ;;
    nextjs-better-auth-frontend) echo "nextjs-better-auth-frontend" ;;
    nextjs-cypress-setup) echo "nextjs-cypress-setup" ;;
    nextjs-cypress-e2e) echo "nextjs-cypress-e2e" ;;
    *) die "Unknown type: ${type}" ;;
  esac
}

template_filename() {
  local kind="$1" type="$2"
  echo "${kind}-${type}.md"
}

template_path() {
  local kind="$1" type="$2"
  echo "$(skill_dir)/assets/templates/$(template_filename "$kind" "$type")"
}

normalize_slug() {
  local name="$1" kind="$2"
  name="$(echo "$name" | tr '[:upper:]' '[:lower:]')"
  name="${name#prd-}"
  name="${name#ticket-}"
  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || \
    die "Invalid --name slug '${name}'. Use lowercase letters, digits, hyphens."
  echo "$name"
}

default_relpath() {
  local kind="$1" slug="$2"
  # Directory layout: features/tasks/prd-<slug>/prd.md | ticket-<slug>/ticket.md
  echo "${TASKS_REL}/${kind}-${slug}/${kind}.md"
}

_jq_vendor_dir() {
  echo "$(skill_dir)/scripts/.vendor/bin"
}

_jq_detect_asset() {
  local uname_s uname_m
  uname_s="$(uname -s 2>/dev/null || echo unknown)"
  uname_m="$(uname -m 2>/dev/null || echo unknown)"
  case "$uname_s" in
    Linux)
      case "$uname_m" in
        x86_64|amd64) echo "jq-linux-amd64|jq" ;;
        aarch64|arm64) echo "jq-linux-arm64|jq" ;;
        *) die 2 "Unsupported Linux arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    Darwin)
      case "$uname_m" in
        x86_64) echo "jq-macos-amd64|jq" ;;
        arm64) echo "jq-macos-arm64|jq" ;;
        *) die 2 "Unsupported macOS arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      case "$uname_m" in
        x86_64|amd64) echo "jq-windows-amd64.exe|jq.exe" ;;
        aarch64|arm64) echo "jq-windows-arm64.exe|jq.exe" ;;
        *) die 2 "Unsupported Windows arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    *)
      die 2 "Unsupported OS for jq auto-install: ${uname_s}. Install jq manually."
      ;;
  esac
}

_jq_download() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --retry-delay 1 -o "$dest" "$url"
    return $?
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q -O "$dest" "$url"
    return $?
  fi
  return 1
}

ensure_jq() {
  if command -v jq >/dev/null 2>&1; then
    return 0
  fi
  local vdir asset_info asset local_name dest url
  vdir="$(_jq_vendor_dir)"
  mkdir -p "$vdir"
  if [[ -x "${vdir}/jq" ]]; then
    export PATH="${vdir}:${PATH}"
    command -v jq >/dev/null 2>&1 && return 0
  fi
  if [[ -x "${vdir}/jq.exe" ]]; then
    export PATH="${vdir}:${PATH}"
    command -v jq >/dev/null 2>&1 && return 0
  fi
  echo "jq not found; downloading ${JQ_RELEASE_TAG} into ${vdir} ..." >&2
  asset_info="$(_jq_detect_asset)"
  asset="${asset_info%%|*}"
  local_name="${asset_info##*|}"
  dest="${vdir}/${local_name}"
  url="${JQ_RELEASE_BASE}/${asset}"
  if ! _jq_download "$url" "$dest"; then
    echo "Error: failed to download jq from ${url}" >&2
    exit 2
  fi
  chmod +x "$dest" 2>/dev/null || true
  export PATH="${vdir}:${PATH}"
  command -v jq >/dev/null 2>&1 || die 2 "jq downloaded but not on PATH"
  return 0
}

strip_quotes() {
  local v="${1:-}"
  if [[ "$v" == \"*\" && "$v" == *\" ]]; then
    v="${v:1:${#v}-2}"
  elif [[ "$v" == \'*\' && "$v" == *\' ]]; then
    v="${v:1:${#v}-2}"
  fi
  echo "$v"
}

extract_frontmatter() {
  local file="$1"
  awk '
    NR==1 && /^---[[:space:]]*$/ { fm=1; next }
    fm && /^---[[:space:]]*$/ { exit }
    fm { print }
  ' "$file"
}

extract_execution_yaml() {
  local file="$1"
  awk '
    $0 == "## Execution" { found=1; next }
    found && /^## / { exit }
    found && /^```ya?ml[[:space:]]*$/ { grab=1; next }
    found && grab && /^```[[:space:]]*$/ { exit }
    grab { print }
  ' "$file"
}

frontmatter_to_json() {
  local fm="$1"
  local json="{}" line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^([A-Za-z0-9_]+):[[:space:]]*(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    val="$(strip_quotes "${BASH_REMATCH[2]}")"
    json="$(jq -c --arg k "$key" --arg v "$val" '.[$k]=$v' <<<"$json")"
  done <<<"$fm"
  echo "$json"
}

parse_execution_yaml() {
  local block="$1"
  local kind="" type="" target=""
  local current_skill=""
  local params_json="{}"
  local skills_json="[]"
  local in_params=0
  local line key val

  _flush_skill() {
    if [[ -n "$current_skill" ]]; then
      skills_json="$(jq -c --arg n "$current_skill" --argjson p "$params_json" \
        '. + [{name: $n, params: $p}]' <<<"$skills_json")"
    fi
    current_skill=""
    params_json="{}"
    in_params=0
  }

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line// }" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ "$line" =~ ^kind:[[:space:]]*(.*)$ ]]; then
      kind="$(strip_quotes "${BASH_REMATCH[1]}")"
      continue
    fi
    if [[ "$line" =~ ^type:[[:space:]]*(.*)$ ]]; then
      type="$(strip_quotes "${BASH_REMATCH[1]}")"
      continue
    fi
    if [[ "$line" =~ ^target:[[:space:]]*(.*)$ ]]; then
      target="$(strip_quotes "${BASH_REMATCH[1]}")"
      continue
    fi
    if [[ "$line" =~ ^skills:[[:space:]]*$ ]]; then
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*name:[[:space:]]*(.*)$ ]]; then
      _flush_skill
      current_skill="$(strip_quotes "${BASH_REMATCH[1]}")"
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]+params:[[:space:]]*$ ]]; then
      in_params=1
      continue
    fi
    if [[ "$in_params" -eq 1 && "$line" =~ ^[[:space:]]+([A-Za-z0-9_]+):[[:space:]]*(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="$(strip_quotes "${BASH_REMATCH[2]}")"
      params_json="$(jq -c --arg k "$key" --arg v "$val" '.[$k]=$v' <<<"$params_json")"
      continue
    fi
  done <<<"$block"
  _flush_skill

  jq -n --arg kind "$kind" --arg type "$type" --arg target "$target" --argjson skills "$skills_json" \
    '{kind:$kind, type:$type, target:$target, skills:$skills}'
}

execution_json_from_file() {
  local file="$1"
  local yaml
  yaml="$(extract_execution_yaml "$file")"
  [[ -n "$yaml" ]] || die "No ## Execution YAML fence in ${file}"
  parse_execution_yaml "$yaml"
}

replace_placeholders() {
  local content="$1"
  content="${content//\{\{KIND\}\}/${KIND}}"
  content="${content//\{\{TYPE\}\}/${TYPE}}"
  content="${content//\{\{ID\}\}/${DOC_ID}}"
  content="${content//\{\{TITLE\}\}/${TITLE}}"
  content="${content//\{\{ENTITY\}\}/${ENTITY}}"
  content="${content//\{\{entity\}\}/${ENTITY_CAMEL}}"
  content="${content//\{\{entity_kebab\}\}/${ENTITY_KEBAB}}"
  content="${content//\{\{DATE\}\}/${CREATED}}"
  content="${content//\{\{FEATURE_ID_LINE\}\}/${FEATURE_ID_LINE}}"
  content="${content//\{\{TARGET\}\}/${TARGET}}"
  content="${content//\{\{SKILL_NAME\}\}/${SKILL_NAME}}"
  content="${content//\{\{LAYERS\}\}/${LAYERS}}"
  content="${content//\{\{TRANSPORT\}\}/${TRANSPORT}}"
  content="${content//\{\{DATABASE\}\}/${DATABASE}}"
  content="${content//\{\{FLAG\}\}/${FLAG}}"
  content="${content//\{\{PROJECT\}\}/${PROJECT}}"
  content="${content//\{\{POSTGRES_PORT\}\}/${POSTGRES_PORT}}"
  printf '%s' "$content"
}

required_param_keys() {
  local type="$1"
  case "$type" in
    backend-scaffold) echo "entity layers transport database" ;;
    frontend-scaffold) echo "entity flag transport" ;;
    backend-review) echo "entity transport database" ;;
    frontend-review) echo "entity transport" ;;
    nextjs-init) echo "" ;;
    nextjs-db-setup) echo "" ;;
    nextjs-better-auth-setup) echo "" ;;
    nextjs-better-auth-frontend) echo "" ;;
    nextjs-cypress-setup) echo "" ;;
    nextjs-cypress-e2e) echo "entity" ;;
    *) echo "" ;;
  esac
}

is_review_type() {
  local type="$1"
  [[ "$type" == "backend-review" || "$type" == "frontend-review" ]]
}

is_setup_type() {
  local type="$1"
  [[ "$type" == "nextjs-init" || "$type" == "nextjs-db-setup" || \
     "$type" == "nextjs-better-auth-setup" || "$type" == "nextjs-better-auth-frontend" || \
     "$type" == "nextjs-cypress-setup" ]]
}

# Types that only allow kind=prd (setup types + cypress e2e)
is_prd_only_type() {
  local type="$1"
  is_setup_type "$type" || [[ "$type" == "nextjs-cypress-e2e" ]]
}

is_db_setup_type() {
  local type="$1"
  [[ "$type" == "nextjs-db-setup" ]]
}

list_task_files() {
  local dir
  dir="$(tasks_dir)"
  [[ -d "$dir" ]] || return 0
  # Canonical: features/tasks/{prd|ticket}-<slug>/{prd|ticket}.md
  # Legacy flat: features/tasks/{prd|ticket}-<slug>.md
  {
    find "$dir" -mindepth 2 -maxdepth 2 -type f \( \
      -path '*/prd-*/prd.md' -o -path '*/ticket-*/ticket.md' \
    \) 2>/dev/null
    find "$dir" -maxdepth 1 -type f \( -name 'prd-*.md' -o -name 'ticket-*.md' \) 2>/dev/null
  } | sort -u
}

relpath_from_root() {
  local root="$1" abs="$2"
  root="${root%/}"
  if [[ "$abs" == "$root" ]]; then
    echo "."
    return
  fi
  if [[ "$abs" == "$root"/* ]]; then
    echo "${abs#"$root"/}"
    return
  fi
  echo "$abs"
}
