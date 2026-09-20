#!/usr/bin/env bash
# Extract ## Execution as JSON for prd-authoring / nextjs skills.
# Usage: extract-execution.sh <file> [--skill=<skill-name>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

export PRD_SKILL_DIR="$SKILL_DIR"
export PRD_ROOT="${PRD_ROOT:-$(pwd)}"

FILE=""
SKILL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill)
      SKILL="$2"
      shift 2
      ;;
    --skill=*)
      SKILL="${1#--skill=}"
      shift
      ;;
    --help|-h)
      echo "Usage: extract-execution.sh <file> [--skill=<skill-name>]"
      echo "Prints the ## Execution YAML fence as JSON."
      exit 0
      ;;
    --*)
      die "Unknown argument: $1"
      ;;
    *)
      if [[ -z "$FILE" ]]; then
        FILE="$1"
        shift
      else
        die "Unexpected argument: $1"
      fi
      ;;
  esac
done

[[ -n "$FILE" ]] || die "File path required. Usage: extract-execution.sh <file> [--skill=<name>]"
[[ -f "$FILE" ]] || die "File not found: ${FILE}"

ensure_jq

JSON="$(execution_json_from_file "$FILE")"

if [[ -z "$SKILL" ]]; then
  jq . <<<"$JSON"
  exit 0
fi

MATCH="$(jq -c --arg n "$SKILL" '.skills[] | select(.name == $n)' <<<"$JSON")"
[[ -n "$MATCH" ]] || die "Skill '${SKILL}' not found in Execution.skills of ${FILE}"

jq -n --argjson doc "$JSON" --argjson skill "$MATCH" --arg name "$SKILL" \
  '{
    kind: $doc.kind,
    type: $doc.type,
    target: $doc.target,
    skill: $name,
    params: $skill.params
  }'
