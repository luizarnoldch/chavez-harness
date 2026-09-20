#!/usr/bin/env bash
# Validate FEATURES.yml + features/ARCHIVE.yml for the feature-management skill.
# Usage: validate.sh [--root <project>]
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
      echo "Usage: validate.sh [--root <project>]"
      echo "Validates FEATURES.yml and features/ARCHIVE.yml (statuses, IDs, relations, PRDs)."
      exit 0
      ;;
    *)
      die "Unknown argument: $1. Usage: validate.sh [--root <project>]"
      ;;
  esac
done

[[ -d "$ROOT" ]] || die "Root directory does not exist: $ROOT"
ROOT="$(cd "$ROOT" && pwd)"

export FEATURE_ROOT="$ROOT"
export FEATURE_SKILL_DIR="$SKILL_DIR"

ensure_jq
cmd_validate
