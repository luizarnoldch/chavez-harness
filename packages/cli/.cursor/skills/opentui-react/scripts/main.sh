#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REFERENCES_DIR="${SKILL_DIR}/references"
ASSETS_DIR="${SKILL_DIR}/assets"

usage() {
  cat <<'EOF'
Usage:
  main.sh --list
  main.sh --topic <id>
  main.sh --asset <id>

Options:
  --list          List available topics and assets
  --topic <id>    Print references/<id>.md
  --asset <id>    Print assets/<id>.tsx (or matching extension)
EOF
}

is_valid_id() {
  [[ "$1" =~ ^[a-z0-9-]+$ ]]
}

first_line() {
  local file="$1"
  local line
  line="$(sed -n '1,3p' "$file" | sed '/^$/d' | head -n 1)"
  line="${line#\# }"
  printf '%s\n' "$line"
}

list_topics() {
  local f base
  echo "topics:"
  if compgen -G "${REFERENCES_DIR}/*.md" > /dev/null; then
    for f in "${REFERENCES_DIR}"/*.md; do
      base="$(basename "$f" .md)"
      printf '  %s\t%s\n' "$base" "$(first_line "$f")"
    done | sort
  else
    echo "  (none)"
  fi
}

list_assets() {
  local f base
  echo "assets:"
  if compgen -G "${ASSETS_DIR}/*" > /dev/null; then
    for f in "${ASSETS_DIR}"/*; do
      [[ -f "$f" ]] || continue
      base="$(basename "$f")"
      if [[ "$base" == *.test.tsx ]]; then
        base="${base%.test.tsx}"
      elif [[ "$base" == *.tsx ]]; then
        base="${base%.tsx}"
      elif [[ "$base" == *.ts ]]; then
        base="${base%.ts}"
      fi
      printf '  %s\t%s\n' "$base" "$(basename "$f")"
    done | sort
  else
    echo "  (none)"
  fi
}

resolve_asset() {
  local id="$1"
  local candidate
  for candidate in \
    "${ASSETS_DIR}/${id}.tsx" \
    "${ASSETS_DIR}/${id}.test.tsx" \
    "${ASSETS_DIR}/${id}.ts" \
    "${ASSETS_DIR}/${id}.test.ts"; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

case "$1" in
  --list)
    list_topics
    echo
    list_assets
    ;;
  --topic)
    if [[ $# -ne 2 ]]; then
      usage
      exit 1
    fi
    id="$2"
    if ! is_valid_id "$id"; then
      echo "error: invalid topic id: ${id}" >&2
      exit 1
    fi
    path="${REFERENCES_DIR}/${id}.md"
    if [[ ! -f "$path" ]]; then
      echo "error: unknown topic: ${id}" >&2
      exit 1
    fi
    # Ensure resolved path stays under references/
    resolved="$(cd "$(dirname "$path")" && pwd)/$(basename "$path")"
    case "$resolved" in
      "${REFERENCES_DIR}"/*) ;;
      *)
        echo "error: path traversal rejected" >&2
        exit 1
        ;;
    esac
    cat "$resolved"
    ;;
  --asset)
    if [[ $# -ne 2 ]]; then
      usage
      exit 1
    fi
    id="$2"
    if ! is_valid_id "$id"; then
      echo "error: invalid asset id: ${id}" >&2
      exit 1
    fi
    if ! path="$(resolve_asset "$id")"; then
      echo "error: unknown asset: ${id}" >&2
      exit 1
    fi
    resolved="$(cd "$(dirname "$path")" && pwd)/$(basename "$path")"
    case "$resolved" in
      "${ASSETS_DIR}"/*) ;;
      *)
        echo "error: path traversal rejected" >&2
        exit 1
        ;;
    esac
    cat "$resolved"
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "error: unknown option: $1" >&2
    usage
    exit 1
    ;;
esac
