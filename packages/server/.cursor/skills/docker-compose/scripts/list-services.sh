#!/usr/bin/env bash
# List available docker-compose service fragment ids.
# Usage: list-services.sh [--skill <path>]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL="$(skill_dir_from_scripts "$SCRIPT_DIR")"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill)
      [[ $# -ge 2 ]] || die "--skill requires a path"
      SKILL="$2"
      shift 2
      ;;
    --skill=*)
      SKILL="${1#--skill=}"
      shift
      ;;
    --help|-h)
      echo "Usage: $(basename "$0") [--skill <path>]"
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

SKILL="$(cd "$SKILL" && pwd)"
COMPOSE_DIR="${SKILL}/assets/compose"

echo "Available services:"
while IFS= read -r id; do
  frag="$(compose_fragment_path "$SKILL" "$id")"
  key="$(extract_yaml_key "$frag" || echo "?")"
  vol="$(volume_fragment_path "$SKILL" "$id")"
  envf="$(env_fragment_path "$SKILL" "$id")"
  extras=""
  [[ -f "$vol" ]] && extras+=" volume"
  [[ -f "$envf" ]] && extras+=" env"
  echo "  - $id  (compose key: $key;${extras:- none})"
done < <(list_service_ids "$COMPOSE_DIR")
