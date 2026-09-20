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

# Resolve sibling nextjs-env-config skill dir from this skill dir
env_config_skill_dir() {
  local skill_dir="$1"
  local candidate="${skill_dir}/../nextjs-env-config"
  if [[ -f "${candidate}/SKILL.md" ]]; then
    cd "$candidate" && pwd
    return 0
  fi
  return 1
}

# Canonical asset → destination relative paths (under ROOT)
# Prints: ASSET_REL|DEST_REL
file_map() {
  cat <<'EOF'
lib/auth/index.ts|src/lib/auth/index.ts
lib/auth/email-password/email.ts|src/lib/auth/email-password/email.ts
lib/auth/email-password/password.ts|src/lib/auth/email-password/password.ts
lib/auth/email-password/verification.ts|src/lib/auth/email-password/verification.ts
lib/auth/hooks/createMiddleware.ts|src/lib/auth/hooks/createMiddleware.ts
lib/auth-client.ts|src/lib/auth-client.ts
app/api/auth/[...all]/route.ts|src/app/api/auth/[...all]/route.ts
db/auth/auth-schema.ts|src/db/auth/auth-schema.ts
EOF
}

# Package names that must appear in package.json
required_dep_names() {
  cat <<'EOF'
better-auth
EOF
}

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

package_json_has_type_module() {
  local root="$1"
  local pkg="${root}/package.json"
  [[ -f "$pkg" ]] || return 1
  python3 - "$pkg" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
sys.exit(0 if data.get("type") == "module" else 1)
PY
}

canonical_package_scripts() {
  cat <<'EOF'
auth:generate|bunx auth@latest generate --config ./src/lib/auth/index.ts --output ./src/db/auth/auth-schema.ts -y
EOF
}

config_has_next_public_app_url() {
  local root="$1"
  local config="${root}/src/lib/config.ts"
  [[ -f "$config" ]] || return 1
  grep -q 'nextPublicAppUrl' "$config"
}

config_has_better_auth_keys() {
  local root="$1"
  local config="${root}/src/lib/config.ts"
  [[ -f "$config" ]] || return 1
  grep -q 'betterAuthSecret' "$config" && grep -q 'betterAuthUrl' "$config" \
    && grep -q 'BETTER_AUTH_SECRET' "$config" && grep -q 'BETTER_AUTH_URL' "$config"
}

db_has_auth_relations() {
  local root="$1"
  local db="${root}/src/lib/db.ts"
  [[ -f "$db" ]] || return 1
  grep -q 'authRelations' "$db" \
    && grep -q 'export default db' "$db" \
    && ! grep -qE 'export[[:space:]]*\{[^}]*\bdb\b[^}]*\}' "$db"
}

schema_exports_auth() {
  local root="$1"
  local schema="${root}/src/db/schema.ts"
  [[ -f "$schema" ]] || return 1
  grep -qE 'from\s+["'\'']\./auth/auth-schema["'\'']' "$schema"
}

env_example_has_key() {
  local root="$1"
  local key="$2"
  local example="${root}/.env.example"
  [[ -f "$example" ]] || return 1
  grep -qE "^${key}=" "$example"
}
