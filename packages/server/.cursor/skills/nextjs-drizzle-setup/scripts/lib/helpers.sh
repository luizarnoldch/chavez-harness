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
lib/db.ts|src/lib/db.ts
drizzle.config.ts|drizzle.config.ts
db/schema.ts|src/db/schema.ts
db/scripts/seed.ts|src/db/scripts/seed.ts
db/scripts/reset.ts|src/db/scripts/reset.ts
EOF
}

# Package names that must appear in package.json (dependencies or devDependencies)
required_dep_names() {
  cat <<'EOF'
drizzle-orm
pg
dotenv
drizzle-kit
tsx
@types/pg
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

# Returns 0 if package.json scripts[key] equals expected value
package_json_has_script() {
  local root="$1"
  local key="$2"
  local expected="$3"
  local pkg="${root}/package.json"
  [[ -f "$pkg" ]] || return 1
  python3 - "$pkg" "$key" "$expected" <<'PY'
import json, sys
path, key, expected = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    data = json.load(f)
scripts = data.get("scripts") or {}
sys.exit(0 if scripts.get(key) == expected else 1)
PY
}

# Returns 0 if src/lib/config.ts mentions databaseUrl export usage
config_has_database_url() {
  local root="$1"
  local config="${root}/src/lib/config.ts"
  [[ -f "$config" ]] || return 1
  grep -q 'databaseUrl' "$config"
}

canonical_package_scripts() {
  cat <<'EOF'
db:seed|bun run ./src/db/scripts/seed.ts
db:reset|bun run ./src/db/scripts/reset.ts
EOF
}
