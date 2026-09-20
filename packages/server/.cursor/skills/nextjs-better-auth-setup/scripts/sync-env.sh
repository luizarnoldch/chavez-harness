#!/usr/bin/env bash
# Add BETTER_AUTH_* to config.ts + append-only env via nextjs-env-config add-env-var.
# Usage: sync-env.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""

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
      echo "Usage: sync-env.sh --root <project>"
      echo "Adds BETTER_AUTH_SECRET and BETTER_AUTH_URL via nextjs-env-config add-env-var.sh."
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ENV_SKILL="$(env_config_skill_dir "$SKILL_DIR")" || die "nextjs-env-config skill not found next to this skill"

ADD="${ENV_SKILL}/scripts/add-env-var.sh"
[[ -x "$ADD" || -f "$ADD" ]] || die "add-env-var.sh missing: $ADD"

bash "$ADD" --root "$ROOT" \
  --key BETTER_AUTH_SECRET \
  --value "" \
  --example-value " # rand - base64 32" \
  --zod 'z.string()' \
  --config-key betterAuthSecret

bash "$ADD" --root "$ROOT" \
  --key BETTER_AUTH_URL \
  --value "http://localhost:3000" \
  --example-value "http://localhost:3000 # Base URL of your app" \
  --zod 'z.string().optional().default("http://localhost:3000")' \
  --config-key betterAuthUrl

echo "sync-env done"
