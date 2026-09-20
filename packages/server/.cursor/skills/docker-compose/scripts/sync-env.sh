#!/usr/bin/env bash
# Append-only sync of assets/env/<service>.env into .env.example and .env.
# Never rewrites existing values. New keys are appended with >> only.
# Usage: sync-env.sh --root <project> --service <id> [--skill <path>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
SERVICE=""
SKILL="$(skill_dir_from_scripts "$SCRIPT_DIR")"
SYNC_ENV=true
SYNC_EXAMPLE=true

show_help() {
  cat <<EOF
Append-only env sync for a docker-compose service fragment

Usage:
  $(basename "$0") --root <project> --service <id> [options]

Options:
  --root <path>       Project root (required)
  --service <id>      Service id (e.g. postgres, minio) (required)
  --skill <path>      Skill directory (default: parent of scripts/)
  --skip-env          Do not touch .env
  --skip-example      Do not touch .env.example
  -h, --help          Show help

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
    --service)
      [[ $# -ge 2 ]] || die "--service requires an id"
      SERVICE="$2"
      shift 2
      ;;
    --service=*)
      SERVICE="${1#--service=}"
      shift
      ;;
    --skill)
      [[ $# -ge 2 ]] || die "--skill requires a path"
      SKILL="$2"
      shift 2
      ;;
    --skill=*)
      SKILL="${1#--skill=}"
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
[[ -n "$SERVICE" ]] || die "Missing --service <id>. Run with --help."

ROOT="$(cd "$ROOT" && pwd)"
SKILL="$(cd "$SKILL" && pwd)"
validate_root "$ROOT"
validate_service_id "$SKILL" "$SERVICE"

ENV_ASSET="$(env_fragment_path "$SKILL" "$SERVICE")"
[[ -f "$ENV_ASSET" ]] || die "Missing env fragment: $ENV_ASSET"

ENV_FILE="${ROOT}/.env"
EXAMPLE_FILE="${ROOT}/.env.example"

echo "==> sync env for service '$SERVICE' (append-only)"

while IFS= read -r line || [[ -n "$line" ]]; do
  # skip blank / comments
  [[ -z "${line//[[:space:]]/}" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" == *"="* ]] || continue

  key="${line%%=*}"
  value="${line#*=}"
  key="${key%"${key##*[![:space:]]}"}"
  key="${key#"${key%%[![:space:]]*}"}"
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "Invalid env key in $ENV_ASSET: $key"

  if [[ "$SYNC_EXAMPLE" == true ]]; then
    append_env_key "$EXAMPLE_FILE" "$key" "$value"
  fi
  if [[ "$SYNC_ENV" == true ]]; then
    append_env_key "$ENV_FILE" "$key" "$value"
  fi
done <"$ENV_ASSET"
