#!/usr/bin/env bash
# Validate PRD / ticket contract for the prd-authoring skill.
# Usage: validate.sh [--root <project>] [--path <rel-or-abs>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(pwd)"
PATH_ARG=""

# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

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
    --path)
      [[ $# -ge 2 ]] || die "--path requires a file path"
      PATH_ARG="$2"
      shift 2
      ;;
    --path=*)
      PATH_ARG="${1#--path=}"
      shift
      ;;
    --help|-h)
      echo "Usage: validate.sh [--root <project>] [--path features/tasks/prd-<slug>/prd.md]"
      echo "Validates frontmatter + ## Execution contract for PRDs and tickets."
      exit 0
      ;;
    *)
      die "Unknown argument: $1. Usage: validate.sh [--root <project>] [--path <file>]"
      ;;
  esac
done

[[ -d "$ROOT" ]] || die "Root directory does not exist: $ROOT"
ROOT="$(cd "$ROOT" && pwd)"

export PRD_ROOT="$ROOT"
export PRD_SKILL_DIR="$SKILL_DIR"

ensure_jq

ERRORS=0

err() {
  echo "FAIL: $*" >&2
  ERRORS=$((ERRORS + 1))
}

ok() {
  echo "OK: $*"
}

validate_file() {
  local file="$1"
  local rel fm fm_json exec_json
  local kind type id entity fname parent expected_skill skill_name skill_count
  local key val

  [[ -f "$file" ]] || { err "file not found: ${file}"; return; }

  rel="$(relpath_from_root "$ROOT" "$file")"
  if [[ "$rel" != features/tasks/* ]]; then
    err "${rel}: path must be under features/tasks/"
  fi

  fname="$(basename "$file")"
  parent="$(basename "$(dirname "$file")")"

  # Canonical: features/tasks/prd-<slug>/prd.md | ticket-<slug>/ticket.md
  # Legacy:    features/tasks/prd-<slug>.md | ticket-<slug>.md
  if [[ "$fname" =~ ^(prd|ticket)\.md$ ]]; then
    [[ "$parent" =~ ^(prd|ticket)-.+$ ]] || \
      err "${rel}: parent dir must be prd-<slug> or ticket-<slug> (got '${parent}')"
  elif [[ "$fname" =~ ^(prd|ticket)-.+\.md$ ]]; then
    :
  else
    err "${rel}: expected .../prd-<slug>/prd.md, .../ticket-<slug>/ticket.md, or legacy flat prd-*.md / ticket-*.md"
  fi

  fm="$(extract_frontmatter "$file")"
  [[ -n "$fm" ]] || { err "${rel}: missing YAML frontmatter"; return; }
  fm_json="$(frontmatter_to_json "$fm")"

  kind="$(jq -r '.kind // empty' <<<"$fm_json")"
  type="$(jq -r '.type // empty' <<<"$fm_json")"
  id="$(jq -r '.id // empty' <<<"$fm_json")"
  entity="$(jq -r '.entity // empty' <<<"$fm_json")"

  [[ -n "$kind" ]] || err "${rel}: frontmatter.kind required"
  [[ -n "$type" ]] || err "${rel}: frontmatter.type required"
  [[ -n "$id" ]] || err "${rel}: frontmatter.id required"
  [[ -n "$entity" ]] || err "${rel}: frontmatter.entity required"
  [[ "$kind" =~ ^(${VALID_KINDS})$ ]] || err "${rel}: invalid kind '${kind}'"
  [[ "$type" =~ ^(${VALID_TYPES})$ ]] || err "${rel}: invalid type '${type}'"

  if [[ "$fname" =~ ^(prd|ticket)\.md$ ]]; then
    if [[ -n "$kind" && "$fname" != "${kind}.md" ]]; then
      err "${rel}: file must be named ${kind}.md for kind=${kind}"
    fi
    if [[ -n "$kind" && "$parent" != "${kind}-"* ]]; then
      err "${rel}: parent dir '${parent}' must start with ${kind}-"
    fi
  elif [[ -n "$kind" && "$fname" != "${kind}-"* ]]; then
    err "${rel}: filename prefix must match kind (${kind}-)"
  fi
  if is_review_type "$type" && [[ "$kind" != "ticket" ]]; then
    err "${rel}: type ${type} must be kind=ticket"
  fi
  if is_prd_only_type "$type" && [[ "$kind" != "prd" ]]; then
    err "${rel}: type ${type} must be kind=prd"
  fi

  if grep -q '{{' "$file"; then
    err "${rel}: leftover {{placeholders}}"
  fi

  local yaml
  yaml="$(extract_execution_yaml "$file")"
  if [[ -z "$yaml" ]]; then
    err "${rel}: missing ## Execution YAML fence"
    return
  fi

  exec_json="$(parse_execution_yaml "$yaml")"
  local ekind etype
  ekind="$(jq -r '.kind // empty' <<<"$exec_json")"
  etype="$(jq -r '.type // empty' <<<"$exec_json")"
  [[ "$ekind" == "$kind" ]] || err "${rel}: Execution.kind '${ekind}' != frontmatter.kind '${kind}'"
  [[ "$etype" == "$type" ]] || err "${rel}: Execution.type '${etype}' != frontmatter.type '${type}'"
  [[ -n "$(jq -r '.target // empty' <<<"$exec_json")" ]] || err "${rel}: Execution.target required"

  skill_count="$(jq '.skills | length' <<<"$exec_json")"
  [[ "$skill_count" == "1" ]] || err "${rel}: Execution.skills must have exactly 1 entry (got ${skill_count})"

  skill_name="$(jq -r '.skills[0].name // empty' <<<"$exec_json")"
  expected_skill="$(skill_name_for_type "$type")"
  [[ "$skill_name" == "$expected_skill" ]] || \
    err "${rel}: skills[0].name '${skill_name}' != ${expected_skill} for type ${type}"
  [[ "$skill_name" =~ ^(${KNOWN_SKILLS})$ ]] || err "${rel}: unknown skill name '${skill_name}'"

  local required_keys
  required_keys="$(required_param_keys "$type")"
  if [[ " ${required_keys} " == *" entity "* ]]; then
    local pentity
    pentity="$(jq -r '.skills[0].params.entity // empty' <<<"$exec_json")"
    [[ "$pentity" == "$entity" ]] || err "${rel}: params.entity '${pentity}' != frontmatter.entity '${entity}'"
  fi

  for key in $required_keys; do
    val="$(jq -r --arg k "$key" '.skills[0].params[$k] // empty' <<<"$exec_json")"
    [[ -n "$val" ]] || err "${rel}: params.${key} required for type ${type}"
  done

  if [[ "$ERRORS" -eq 0 ]]; then
    ok "$rel"
  fi
}

FILES=()
if [[ -n "$PATH_ARG" ]]; then
  if [[ "$PATH_ARG" = /* ]]; then
    FILES+=("$PATH_ARG")
  else
    FILES+=("${ROOT}/${PATH_ARG}")
  fi
else
  while IFS= read -r f; do
    [[ -n "$f" ]] && FILES+=("$f")
  done < <(list_task_files)
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No PRD/ticket files to validate under ${ROOT}/${TASKS_REL}"
  exit 0
fi

for f in "${FILES[@]}"; do
  validate_file "$f"
done

if [[ "$ERRORS" -gt 0 ]]; then
  echo "VERDICT:FAIL (${ERRORS} error(s))" >&2
  exit 1
fi
echo "VERDICT:PASS"
