#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "Error: $*" >&2
  exit 1
}

validate_root() {
  local root="$1"
  if [[ ! -d "$root" ]]; then
    die "Target path does not exist: $root"
  fi
  if [[ ! -d "$root/src" ]]; then
    die "Target does not appear to be a Next.js project (no src/ folder): $root"
  fi
}

# Absolute skill dir (parent of scripts/)
skill_dir_from_scripts() {
  local script_dir="$1"
  cd "${script_dir}/.." && pwd
}

# Canonical asset → destination relative paths (under ROOT)
# Prints: ASSET_REL|DEST_REL
file_map() {
  cat <<'EOF'
trpc/client.tsx|src/trpc/client.tsx
trpc/init.ts|src/trpc/init.ts
trpc/server.tsx|src/trpc/server.tsx
trpc/query-client.ts|src/trpc/query-client.ts
trpc/routers/_app.ts|src/trpc/routers/_app.ts
app/api/trpc/[trpc]/route.ts|src/app/api/trpc/[trpc]/route.ts
EOF
}

layout_has_provider() {
  local layout="$1"
  [[ -f "$layout" ]] || return 1
  grep -q 'TRPCReactProvider' "$layout"
}

layout_has_import() {
  local layout="$1"
  [[ -f "$layout" ]] || return 1
  grep -qE 'from ["'\'']@/trpc/client["'\'']' "$layout"
}

# Package names that must appear in package.json (dependencies or devDependencies)
required_dep_names() {
  cat <<'EOF'
@trpc/server
@trpc/client
@trpc/tanstack-react-query
@tanstack/react-query
zod
client-only
server-only
superjson
react-error-boundary
EOF
}

# Specs passed to `bun add` for a missing package name
bun_add_spec_for() {
  local name="$1"
  case "$name" in
    @tanstack/react-query) echo "@tanstack/react-query@latest" ;;
    *) echo "$name" ;;
  esac
}

# Full canonical bun add argv (for --force-install)
canonical_bun_add_specs() {
  cat <<'EOF'
@trpc/server
@trpc/client
@trpc/tanstack-react-query
@tanstack/react-query@latest
zod
client-only
server-only
superjson
react-error-boundary
EOF
}

# Returns 0 if package name is listed under dependencies or devDependencies
package_json_has_dep() {
  local root="$1"
  local name="$2"
  local pkg="${root}/package.json"
  [[ -f "$pkg" ]] || return 1
  python3 - "$pkg" "$name" <<'PY'
import json, sys
path, name = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
for key in ("dependencies", "devDependencies"):
    if name in (data.get(key) or {}):
        sys.exit(0)
sys.exit(1)
PY
}
