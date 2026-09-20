#!/usr/bin/env bash
# PRD / ticket authoring CLI — entry point for the prd-authoring skill.
# Usage: prd-cli.sh [--root <project>] <command> [args...]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(pwd)"

# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

usage_hint() {
  echo "Run: bash scripts/prd-cli.sh help" >&2
  echo "     bash scripts/prd-cli.sh help --json   # machine-readable for LLMs" >&2
}

cmd_help_json() {
  cat <<'EOF'
{
  "skill": "prd-authoring",
  "usage": "prd-cli.sh [--root <project>] <command> [args...]",
  "notes": [
    "Creates features/tasks/prd-<slug>/prd.md and features/tasks/ticket-<slug>/ticket.md only.",
    "Never mutates FEATURES.yml. Handoff link-prd to feature-management.",
    "Fill human sections after create; do not rewrite ## Execution.",
    "jq is auto-vendored on first non-help command."
  ],
  "commands": [
    {
      "command": "help",
      "description": "Print human help or JSON CommandSpec. Does not require jq.",
      "usage": "prd-cli help [--json]",
      "arguments": ["--json (optional)"],
      "examples": ["./prd-cli.sh help", "./prd-cli.sh help --json"]
    },
    {
      "command": "create",
      "description": "Copy a kind+type template into features/tasks/<kind>-<slug>/, replace placeholders, print feature-management handoff.",
      "usage": "prd-cli [--root=<path>] create --kind=prd|ticket --type=<type> --name=<slug> --entity=<Entity> [flags]",
      "arguments": [
        "--kind (prd|ticket, required)",
        "--type (backend-scaffold|frontend-scaffold|backend-review|frontend-review|nextjs-init|nextjs-db-setup|nextjs-better-auth-setup|nextjs-better-auth-frontend|nextjs-cypress-setup|nextjs-cypress-e2e, required)",
        "--name (slug, required)",
        "--entity (PascalCase or kebab-case; required except setup types default to App; required for nextjs-cypress-e2e)",
        "--layers (schema|server|hooks|all, default all, backend-scaffold)",
        "--transport (trpc|api, default trpc)",
        "--database (prisma|drizzle, default prisma, backend-*)",
        "--flag (--all|--page list|--view|--view-full, default --all, frontend-scaffold)",
        "--project (compose prefix, required for nextjs-db-setup)",
        "--postgres-port (host port, required for nextjs-db-setup)",
        "--target (absolute Next.js root, default --root)",
        "--feature (optional feature ID for handoff)",
        "--order (int, default 1)",
        "--execution (sequential|parallel, default sequential)",
        "--out (override relative or absolute path)",
        "--force (overwrite existing file)"
      ],
      "examples": [
        "./prd-cli.sh --root /proj create --kind=prd --type=backend-scaffold --name=catalog-backend --entity=Product --feature=NOV-1",
        "./prd-cli.sh --root /proj create --kind=ticket --type=backend-review --name=product-backend-review --entity=Product",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-init --name=nextjs-init",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-db-setup --name=drizzle-db --project=nextjs-harness --postgres-port=5432",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-better-auth-setup --name=better-auth-setup --feature=NJH-3",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-better-auth-frontend --name=better-auth-frontend --feature=NJH-3 --order=2",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-cypress-setup --name=cypress-setup --feature=NJH-4",
        "./prd-cli.sh --root /proj create --kind=prd --type=nextjs-cypress-e2e --name=task-e2e --entity=Task --feature=NJH-4 --order=2"
      ]
    },
    {
      "command": "list",
      "description": "List features/tasks/prd-*/prd.md and features/tasks/ticket-*/ticket.md with kind, type, id, entity.",
      "usage": "prd-cli [--root=<path>] list",
      "arguments": [],
      "examples": ["./prd-cli.sh list"]
    }
  ]
}
EOF
}

cmd_help_text() {
  cat <<'HELP'
==========================================================================
                     PRD AUTHORING CLI - HELP & MANUAL
==========================================================================
Creates PRDs and tickets under features/tasks/. Does not write FEATURES.yml.

Usage: prd-cli.sh [--root <project>] <command> [args...]

LLM / agent quick start (in order):
  1. prd-cli.sh help --json
  2. prd-cli.sh --root <p> create --kind=... --type=... --name=... --entity=...
  3. Fill human sections; leave ## Execution unchanged
  4. validate.sh --root <p>
  5. If HANDOFF action is link-prd, load feature-management and run link-prd

Commands:
  create --kind=prd|ticket --type=<type> --name=<slug> --entity=<Entity> [flags]
  list
  help [--json]

Types:
  backend-scaffold   prd|ticket  → nextjs-backend-scaffolding
  frontend-scaffold  prd|ticket  → nextjs-frontend-scaffolding
  backend-review     ticket      → nextjs-backend-scaffolding-reviewer
  frontend-review    ticket      → nextjs-frontend-scaffolding-reviewer
  nextjs-init                 prd         → nextjs-trpc-setup (steps 1–2+4 guide-only; step 4 = nextjs-env-config)
  nextjs-db-setup             prd         → nextjs-drizzle-setup (steps 1–2 guide-only: docker-compose + nextjs-env-config)
  nextjs-better-auth-setup    prd         → nextjs-better-auth-setup (env via skill sync-env / add-env-var)
  nextjs-better-auth-frontend prd         → nextjs-better-auth-frontend (after foundation validate PASS)
  nextjs-cypress-setup        prd         → nextjs-cypress-setup (after better-auth frontend)
  nextjs-cypress-e2e          prd         → nextjs-cypress-e2e (requires --entity; after harness + frontend scaffold)

Create flags:
  --layers=schema|server|hooks|all     --transport=trpc|api
  --database=prisma|drizzle            --flag='--all'
  --project=<prefix>                   --postgres-port=<port>  (required for nextjs-db-setup)
  --target=<abs-next-app>              --feature=<ID>
  --order=N                            --execution=sequential|parallel
  --out=<path>                         --force

Paths: features/tasks/prd-<slug>/prd.md | features/tasks/ticket-<slug>/ticket.md
Validate: bash scripts/validate.sh --root <project>
Extract:  bash scripts/extract-execution.sh <file> [--skill=<name>]
jq: auto-vendored on first non-help command if missing
==========================================================================
HELP
}

cmd_list() {
  local file rel fm json
  local found=0
  printf '%-40s %-8s %-22s %-32s %s\n' "PATH" "KIND" "TYPE" "ID" "ENTITY"
  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    found=1
    rel="$(relpath_from_root "$(prd_root)" "$file")"
    fm="$(extract_frontmatter "$file")"
    json="$(frontmatter_to_json "$fm")"
    printf '%-40s %-8s %-22s %-32s %s\n' \
      "$rel" \
      "$(jq -r '.kind // "-"' <<<"$json")" \
      "$(jq -r '.type // "-"' <<<"$json")" \
      "$(jq -r '.id // "-"' <<<"$json")" \
      "$(jq -r '.entity // "-"' <<<"$json")"
  done < <(list_task_files)
  if [[ "$found" -eq 0 ]]; then
    echo "(no features/tasks/prd-*/prd.md or features/tasks/ticket-*/ticket.md under $(prd_root))"
  fi
}

cmd_create() {
  local kind="" type="" name="" entity="" layers="all" transport="trpc" database="prisma"
  local flag="--all" target="" feature="" order="1" execution="sequential" out="" force=0
  local project="" postgres_port=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --kind) kind="$2"; shift 2 ;;
      --kind=*) kind="${1#--kind=}"; shift ;;
      --type) type="$2"; shift 2 ;;
      --type=*) type="${1#--type=}"; shift ;;
      --name) name="$2"; shift 2 ;;
      --name=*) name="${1#--name=}"; shift ;;
      --entity) entity="$2"; shift 2 ;;
      --entity=*) entity="${1#--entity=}"; shift ;;
      --layers) layers="$2"; shift 2 ;;
      --layers=*) layers="${1#--layers=}"; shift ;;
      --transport) transport="$2"; shift 2 ;;
      --transport=*) transport="${1#--transport=}"; shift ;;
      --database) database="$2"; shift 2 ;;
      --database=*) database="${1#--database=}"; shift ;;
      --flag) flag="$2"; shift 2 ;;
      --flag=*) flag="${1#--flag=}"; shift ;;
      --project) project="$2"; shift 2 ;;
      --project=*) project="${1#--project=}"; shift ;;
      --postgres-port) postgres_port="$2"; shift 2 ;;
      --postgres-port=*) postgres_port="${1#--postgres-port=}"; shift ;;
      --target) target="$2"; shift 2 ;;
      --target=*) target="${1#--target=}"; shift ;;
      --feature) feature="$2"; shift 2 ;;
      --feature=*) feature="${1#--feature=}"; shift ;;
      --order) order="$2"; shift 2 ;;
      --order=*) order="${1#--order=}"; shift ;;
      --execution) execution="$2"; shift 2 ;;
      --execution=*) execution="${1#--execution=}"; shift ;;
      --out) out="$2"; shift 2 ;;
      --out=*) out="${1#--out=}"; shift ;;
      --force) force=1; shift ;;
      *) die "Unknown create argument: $1" ;;
    esac
  done

  [[ -n "$kind" ]] || die "--kind is required (prd|ticket)"
  [[ -n "$type" ]] || die "--type is required"
  [[ -n "$name" ]] || die "--name is required"

  [[ "$kind" =~ ^(${VALID_KINDS})$ ]] || die "Invalid --kind: ${kind}"
  [[ "$type" =~ ^(${VALID_TYPES})$ ]] || die "Invalid --type: ${type}"
  if is_review_type "$type" && [[ "$kind" != "ticket" ]]; then
    die "Type ${type} only supports --kind=ticket"
  fi
  if is_prd_only_type "$type" && [[ "$kind" != "prd" ]]; then
    die "Type ${type} only supports --kind=prd"
  fi
  if [[ -z "$entity" ]]; then
    if is_setup_type "$type"; then
      entity="App"
    else
      die "--entity is required"
    fi
  fi
  if is_db_setup_type "$type"; then
    [[ -n "$project" ]] || die "--project is required for type nextjs-db-setup"
    [[ -n "$postgres_port" ]] || die "--postgres-port is required for type nextjs-db-setup"
    [[ "$postgres_port" =~ ^[0-9]+$ ]] || die "--postgres-port must be an integer"
  fi
  [[ "$layers" =~ ^(${VALID_LAYERS})$ ]] || die "Invalid --layers: ${layers}"
  [[ "$transport" =~ ^(${VALID_TRANSPORT})$ ]] || die "Invalid --transport: ${transport}"
  [[ "$database" =~ ^(${VALID_DATABASE})$ ]] || die "Invalid --database: ${database}"
  [[ "$flag" =~ ^(${VALID_FLAGS})$ ]] || die "Invalid --flag: ${flag} (use --all, --page list, --view, --view-full)"
  [[ "$order" =~ ^[0-9]+$ ]] || die "--order must be an integer"
  [[ "$execution" =~ ^(${VALID_EXECUTION})$ ]] || die "Invalid --execution: ${execution}"

  local slug tpl dest dest_abs
  slug="$(normalize_slug "$name" "$kind")"
  tpl="$(template_path "$kind" "$type")"
  [[ -f "$tpl" ]] || die "Template not found: ${tpl}"

  if [[ -z "$target" ]]; then
    target="$(prd_root)"
  fi
  [[ -d "$target" ]] || die "--target is not a directory: ${target}"
  target="$(cd "$target" && pwd)"

  if [[ -n "$out" ]]; then
    if [[ "$out" = /* ]]; then
      dest_abs="$out"
    else
      dest_abs="$(prd_root)/${out}"
    fi
  else
    dest_abs="$(prd_root)/$(default_relpath "$kind" "$slug")"
  fi

  if [[ -e "$dest_abs" && "$force" -ne 1 ]]; then
    die "File already exists (pass --force to overwrite): ${dest_abs}"
  fi

  KIND="$kind"
  TYPE="$type"
  DOC_ID="${kind}-${slug}-v1"
  ENTITY="$(to_pascal_case "$entity")"
  ENTITY_CAMEL="$(to_camel_case "$entity")"
  ENTITY_KEBAB="$(to_kebab_case "$entity")"
  TITLE="$(title_from_slug "$slug" "$ENTITY" "$type")"
  CREATED="$(utc_date)"
  TARGET="$target"
  SKILL_NAME="$(skill_name_for_type "$type")"
  LAYERS="$layers"
  TRANSPORT="$transport"
  DATABASE="$database"
  FLAG="$flag"
  PROJECT="$project"
  POSTGRES_PORT="$postgres_port"
  if [[ -n "$feature" ]]; then
    FEATURE_ID_LINE="feature_id: ${feature}"$'\n'
  else
    FEATURE_ID_LINE=""
  fi

  local rendered
  rendered="$(replace_placeholders "$(cat "$tpl")")"

  mkdir -p "$(dirname "$dest_abs")"
  printf '%s\n' "$rendered" >"$dest_abs"

  dest="$(relpath_from_root "$(prd_root)" "$dest_abs")"
  echo "Created: ${dest}"
  echo
  if [[ -n "$feature" ]]; then
    cat <<EOF
HANDOFF:feature-management
action: link-prd
id: ${feature}
path: ${dest}
order: ${order}
execution: ${execution}
EOF
  else
    cat <<EOF
HANDOFF:feature-management
action: none
path: ${dest}
note: Document created. Link later with feature-management: link-prd <ID> <path> <order> sequential|parallel
EOF
  fi
}

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

export PRD_ROOT="$ROOT"
export PRD_SKILL_DIR="$SKILL_DIR"

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
  list)
    cmd_list
    ;;
  create)
    cmd_create "${REST[@]+"${REST[@]}"}"
    ;;
  *)
    echo "Unknown command: $CMD" >&2
    echo >&2
    cmd_help_text >&2
    echo >&2
    usage_hint
    exit 1
    ;;
esac
