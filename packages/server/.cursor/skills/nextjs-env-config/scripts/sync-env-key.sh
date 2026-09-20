#!/usr/bin/env bash
# Append KEY=VALUE to .env and/or .env.example only if KEY is missing.
# Never rewrites existing values. Does not read .env contents beyond key presence.
# Usage: sync-env-key.sh --root <project> --key KEY [--value VALUE] [--example-value VALUE]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
KEY=""
VALUE=""
EXAMPLE_VALUE=""
SYNC_ENV=true
SYNC_EXAMPLE=true

show_help() {
  cat <<EOF
Append-only env key sync

Usage:
  $(basename "$0") --root <project> --key KEY [--value VALUE] [--example-value VALUE]

Options:
  --root <path>           Project root
  --key KEY               Env var name (required)
  --value VALUE           Value for .env (default: empty string)
  --example-value VALUE   Value for .env.example (default: same as --value)
  --skip-env              Do not touch .env
  --skip-example          Do not touch .env.example
  -h, --help              Show help

Rules:
  - If KEY already exists in the file, skip that file (no rewrite).
  - New keys are appended with >> only.

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
    --key)
      [[ $# -ge 2 ]] || die "--key requires a name"
      KEY="$2"
      shift 2
      ;;
    --key=*)
      KEY="${1#--key=}"
      shift
      ;;
    --value)
      [[ $# -ge 2 ]] || die "--value requires a value"
      VALUE="$2"
      shift 2
      ;;
    --value=*)
      VALUE="${1#--value=}"
      shift
      ;;
    --example-value)
      [[ $# -ge 2 ]] || die "--example-value requires a value"
      EXAMPLE_VALUE="$2"
      shift 2
      ;;
    --example-value=*)
      EXAMPLE_VALUE="${1#--example-value=}"
      shift
      ;;
    --skip-env)
      SYNC_ENV=false
      shift
      ;;
    --skip-example)
      SYNC_EXAMPLE=false
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
[[ -n "$KEY" ]] || die "Missing --key KEY. Run with --help."
[[ "$KEY" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "Invalid env key: $KEY"

ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

if [[ -z "$EXAMPLE_VALUE" && -n "$VALUE" ]]; then
  EXAMPLE_VALUE="$VALUE"
fi

ENV_FILE="${ROOT}/.env"
EXAMPLE_FILE="${ROOT}/.env.example"

if [[ "$SYNC_EXAMPLE" == true ]]; then
  if env_file_has_key "$EXAMPLE_FILE" "$KEY"; then
    echo ".env.example already has $KEY — skip"
  else
    touch "$EXAMPLE_FILE"
    printf '%s=%s\n' "$KEY" "$EXAMPLE_VALUE" >>"$EXAMPLE_FILE"
    echo "Appended $KEY to .env.example"
  fi
fi

if [[ "$SYNC_ENV" == true ]]; then
  if env_file_has_key "$ENV_FILE" "$KEY"; then
    echo ".env already has $KEY — skip"
  else
    # Create .env if missing; never rewrite existing keys
    touch "$ENV_FILE"
    printf '%s=%s\n' "$KEY" "$VALUE" >>"$ENV_FILE"
    echo "Appended $KEY to .env"
  fi
fi
