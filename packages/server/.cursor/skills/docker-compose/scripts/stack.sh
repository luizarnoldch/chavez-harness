#!/usr/bin/env bash
# Stack docker-compose service fragments into ROOT/docker-compose.yml and sync env.
# Usage: stack.sh --root <project> --project <name> --services a,b[,c...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
PROJECT=""
SERVICES_CSV=""
SKILL="$(skill_dir_from_scripts "$SCRIPT_DIR")"
SKIP_ENV=false

show_help() {
  cat <<EOF
Stack docker-compose service fragments

Usage:
  $(basename "$0") --root <project> --project <name> --services <id[,id...]>

Options:
  --root <path>           Project root (required)
  --project <name>        Container name prefix; replaces {{PROJECT}} (required)
  --services <list>       Comma-separated service ids (required)
  --skill <path>          Skill directory (default: parent of scripts/)
  --skip-env              Do not sync .env / .env.example
  -h, --help              Show help

Behavior:
  - Creates docker-compose.yml if missing.
  - Stacks missing services/volumes; skips keys already present.
  - Syncs env keys append-only (>>); never rewrites existing values.

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
    --project)
      [[ $# -ge 2 ]] || die "--project requires a name"
      PROJECT="$2"
      shift 2
      ;;
    --project=*)
      PROJECT="${1#--project=}"
      shift
      ;;
    --services)
      [[ $# -ge 2 ]] || die "--services requires a list"
      SERVICES_CSV="$2"
      shift 2
      ;;
    --services=*)
      SERVICES_CSV="${1#--services=}"
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
      SKIP_ENV=true
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
[[ -n "$PROJECT" ]] || die "Missing --project <name>. Run with --help."
[[ -n "$SERVICES_CSV" ]] || die "Missing --services <id[,id...]>. Run with --help."
[[ "$PROJECT" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || die "Invalid --project name: $PROJECT"

ROOT="$(cd "$ROOT" && pwd)"
SKILL="$(cd "$SKILL" && pwd)"
validate_root "$ROOT"

IFS=',' read -ra SERVICE_IDS <<<"$SERVICES_CSV"
SERVICES=()
for raw in "${SERVICE_IDS[@]}"; do
  id="${raw#"${raw%%[![:space:]]*}"}"
  id="${id%"${id##*[![:space:]]}"}"
  [[ -n "$id" ]] || continue
  validate_service_id "$SKILL" "$id"
  SERVICES+=("$id")
done
[[ ${#SERVICES[@]} -gt 0 ]] || die "No valid services in --services"

COMPOSE_FILE="${ROOT}/docker-compose.yml"
HEADER="${SKILL}/assets/compose/header.yml"
[[ -f "$HEADER" ]] || die "Missing header: $HEADER"

trim_trailing_blanks() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"
  # Delete trailing blank lines
  awk 'BEGIN{n=0} {lines[++n]=$0} END{while(n>0 && lines[n]~/^[[:space:]]*$/) n--; for(i=1;i<=n;i++) print lines[i]}' \
    "$file" >"$tmp"
  mv "$tmp" "$file"
}

ensure_compose_file() {
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "==> create $COMPOSE_FILE"
    cat "$HEADER" >"$COMPOSE_FILE"
    return
  fi
  echo "==> stack into existing $COMPOSE_FILE"
  if ! grep -qE '^services:' "$COMPOSE_FILE"; then
    die "$COMPOSE_FILE exists but has no top-level 'services:' key"
  fi
}

# Insert a service block under services: (before volumes: if present).
insert_service_block() {
  local compose_key="$1"
  local rendered="$2"
  local before after tmp

  if compose_has_key "$COMPOSE_FILE" "$compose_key"; then
    echo "service '$compose_key' already present — skip"
    return 0
  fi

  before="$(mktemp)"
  after="$(mktemp)"
  tmp="$(mktemp)"

  if grep -qE '^volumes:' "$COMPOSE_FILE"; then
    awk '/^volumes:/{exit} {print}' "$COMPOSE_FILE" >"$before"
    awk '/^volumes:/{flag=1} flag{print}' "$COMPOSE_FILE" >"$after"
    trim_trailing_blanks "$before"
    {
      cat "$before"
      echo ""
      printf '%s\n' "$rendered"
      echo ""
      cat "$after"
    } >"$tmp"
  else
    cp "$COMPOSE_FILE" "$before"
    trim_trailing_blanks "$before"
    {
      cat "$before"
      echo ""
      printf '%s\n' "$rendered"
    } >"$tmp"
  fi

  mv "$tmp" "$COMPOSE_FILE"
  rm -f "$before" "$after"
  echo "Added service '$compose_key'"
}

insert_volume_block() {
  local volume_key="$1"
  local rendered="$2"
  local tmp

  if compose_has_key "$COMPOSE_FILE" "$volume_key"; then
    echo "volume '$volume_key' already present — skip"
    return 0
  fi

  tmp="$(mktemp)"
  if ! grep -qE '^volumes:' "$COMPOSE_FILE"; then
    trim_trailing_blanks "$COMPOSE_FILE"
    {
      cat "$COMPOSE_FILE"
      echo ""
      echo "volumes:"
      printf '%s\n' "$rendered"
    } >"$tmp"
  else
    trim_trailing_blanks "$COMPOSE_FILE"
    {
      cat "$COMPOSE_FILE"
      printf '%s\n' "$rendered"
    } >"$tmp"
  fi
  mv "$tmp" "$COMPOSE_FILE"
  echo "Added volume '$volume_key'"
}

ensure_compose_file

for id in "${SERVICES[@]}"; do
  frag="$(compose_fragment_path "$SKILL" "$id")"
  compose_key="$(extract_yaml_key "$frag")" || die "Cannot extract compose key from $frag"
  rendered="$(render_project "$PROJECT" <"$frag")"
  # Normalize: drop trailing whitespace-only lines from rendered block
  rendered="$(printf '%s\n' "$rendered" | awk 'BEGIN{n=0} {lines[++n]=$0} END{while(n>0 && lines[n]~/^[[:space:]]*$/) n--; for(i=1;i<=n;i++) print lines[i]}')"
  insert_service_block "$compose_key" "$rendered"

  vol="$(volume_fragment_path "$SKILL" "$id")"
  if [[ -f "$vol" ]]; then
    vol_key="$(extract_yaml_key "$vol")" || die "Cannot extract volume key from $vol"
    vol_rendered="$(awk 'BEGIN{n=0} {lines[++n]=$0} END{while(n>0 && lines[n]~/^[[:space:]]*$/) n--; for(i=1;i<=n;i++) print lines[i]}' "$vol")"
    insert_volume_block "$vol_key" "$vol_rendered"
  fi
done

if [[ "$SKIP_ENV" == false ]]; then
  for id in "${SERVICES[@]}"; do
    bash "${SCRIPT_DIR}/sync-env.sh" --root "$ROOT" --service "$id" --skill "$SKILL"
  done
else
  echo "==> skip env sync"
fi

echo "==> done: $COMPOSE_FILE"
