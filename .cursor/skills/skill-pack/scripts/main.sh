#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REFS="${SKILL_DIR}/references"
ASSETS="${SKILL_DIR}/assets"

usage() {
  echo "usage: main.sh --list | --topic <id> | --asset <id>" >&2
  exit 1
}

list_ids() {
  local dir="$1"
  local f base
  shopt -s nullglob
  for f in "${dir}"/*.md; do
    base="$(basename "$f" .md)"
    printf '%s\n' "$base"
  done
}

if [[ $# -lt 1 ]]; then
  usage
fi

case "$1" in
  --list)
    echo "topics:"
    list_ids "$REFS"
    echo "assets:"
    list_ids "$ASSETS"
    ;;
  --topic)
    [[ $# -eq 2 ]] || usage
    file="${REFS}/$2.md"
    [[ -f "$file" ]] || { echo "unknown topic: $2" >&2; exit 1; }
    cat "$file"
    ;;
  --asset)
    [[ $# -eq 2 ]] || usage
    file="${ASSETS}/$2.md"
    [[ -f "$file" ]] || { echo "unknown asset: $2" >&2; exit 1; }
    cat "$file"
    ;;
  *)
    usage
    ;;
esac
