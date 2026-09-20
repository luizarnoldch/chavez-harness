#!/usr/bin/env bash
# Feature management CLI — entry point for the feature-management skill.
# Usage: feature-cli.sh [--root <project>] <command> [args...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(pwd)"

# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/yaml_io.sh
source "${SCRIPT_DIR}/lib/yaml_io.sh"
# shellcheck source=lib/ops.sh
source "${SCRIPT_DIR}/lib/ops.sh"

usage_hint() {
  echo "Run: bash scripts/feature-cli.sh help" >&2
  echo "     bash scripts/feature-cli.sh help --json   # machine-readable for LLMs" >&2
}

# Parse global --root before subcommand
ARGS=()
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
      ARGS=(help)
      shift
      break
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#ARGS[@]} -eq 0 ]]; then
  ARGS=(help)
fi

CMD="${ARGS[0]}"
unset 'ARGS[0]' || true
REST=("${ARGS[@]+"${ARGS[@]}"}")

[[ -d "$ROOT" ]] || die "Root directory does not exist: $ROOT"
ROOT="$(cd "$ROOT" && pwd)"

export FEATURE_ROOT="$ROOT"
export FEATURE_SKILL_DIR="$SKILL_DIR"

# help must work without jq so agents can discover the CLI first
case "$CMD" in
  help|--help|-h) ;;
  *) ensure_jq ;;
esac

case "$CMD" in
  help|--help|-h)
    if [[ "${REST[0]:-}" == "--json" ]]; then
      cmd_help_json
    else
      cmd_help_text
    fi
    ;;
  init)
    cmd_init "${REST[@]+"${REST[@]}"}"
    ;;
  list)
    cmd_list
    ;;
  validate)
    cmd_validate
    ;;
  add)
    if [[ ${#REST[@]} -lt 2 ]]; then
      echo "Usage error. Example: feature-cli.sh add 'Auth API' 'Short description'" >&2
      echo "                 or: feature-cli.sh add --id=NOV-1 'Auth API' 'Short description'" >&2
      usage_hint
      exit 1
    fi
    cmd_add "${REST[@]}"
    ;;
  update)
    if [[ ${#REST[@]} -lt 1 ]]; then
      echo "Usage error. Example: feature-cli.sh update --id=NOV-1 --status=in_progress" >&2
      usage_hint
      exit 1
    fi
    cmd_update "${REST[@]}"
    ;;
  link-prd)
    if [[ ${#REST[@]} -lt 4 ]]; then
      echo "Usage error. Example: feature-cli.sh link-prd NOV-1 'features/tasks/prd-auth.md' 1 sequential" >&2
      usage_hint
      exit 1
    fi
    cmd_link_prd "${REST[0]}" "${REST[1]}" "${REST[2]}" "${REST[3]}"
    ;;
  sprint)
    if [[ ${#REST[@]} -lt 1 ]]; then
      echo "Usage error. Example: feature-cli.sh sprint --number=2 --start=2026-08-15 --end=2026-08-28" >&2
      usage_hint
      exit 1
    fi
    cmd_sprint "${REST[@]}"
    ;;
  close-sprint)
    if [[ ${#REST[@]} -lt 1 ]]; then
      echo "Usage error. Example: feature-cli.sh close-sprint --next-start=2026-08-15 --next-end=2026-08-28" >&2
      usage_hint
      exit 1
    fi
    cmd_close_sprint "${REST[@]}"
    ;;
  archive)
    if [[ ${#REST[@]} -lt 1 ]]; then
      echo "Usage error. Example: feature-cli.sh archive NOV-1" >&2
      usage_hint
      exit 1
    fi
    cmd_archive "${REST[0]}"
    ;;
  *)
    echo "Unknown command: $CMD" >&2
    echo >&2
    cmd_help_text >&2
    echo >&2
    echo "Tip: bash scripts/feature-cli.sh help --json" >&2
    exit 1
    ;;
esac
