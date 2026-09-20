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

skill_dir_from_scripts() {
  local script_dir="$1"
  cd "${script_dir}/.." && pwd
}

# Canonical asset → destination (ASSET_REL|DEST_REL)
file_map() {
  cat <<'EOF'
cypress.config.ts|cypress.config.ts
cypress/support/commands.ts|cypress/support/commands.ts
cypress/support/selectors.ts|cypress/support/selectors.ts
cypress/support/e2e.ts|cypress/support/e2e.ts
cypress/support/index.d.ts|cypress/support/index.d.ts
cypress/fixtures/user.json|cypress/fixtures/user.json
cypress/e2e/auth.cy.ts|cypress/e2e/auth.cy.ts
types/import-meta.d.ts|src/types/import-meta.d.ts
EOF
}

required_dep_names() {
  cat <<'EOF'
cypress
EOF
}

canonical_package_scripts() {
  cat <<'EOF'
cy:open|cypress open
cy:run|cypress run --browser chrome
cy:headless|cypress run --e2e --browser chrome --headless
test:e2e|cypress run --browser chrome
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

better_auth_foundation_present() {
  local root="$1"
  [[ -f "${root}/src/lib/auth/index.ts" ]] \
    && [[ -f "${root}/src/app/api/auth/[...all]/route.ts" ]]
}

auth_forms_present() {
  local root="$1"
  [[ -f "${root}/src/features/auth/components/AuthSignInForm.tsx" ]] \
    && [[ -f "${root}/src/features/auth/components/AuthSignUpForm.tsx" ]]
}

db_scripts_present() {
  local root="$1"
  [[ -f "${root}/src/db/scripts/reset.ts" ]] \
    && [[ -f "${root}/src/db/scripts/seed.ts" ]]
}

auth_forms_have_data_cy() {
  local root="$1"
  grep -q 'data-cy-submit-sign-in-form' \
    "${root}/src/features/auth/components/AuthSignInForm.tsx" 2>/dev/null \
    && grep -q 'data-cy-submit-sign-up-form' \
      "${root}/src/features/auth/components/AuthSignUpForm.tsx" 2>/dev/null
}

gitignore_has_cypress() {
  local root="$1"
  local gi="${root}/.gitignore"
  [[ -f "$gi" ]] || return 1
  grep -q 'cypress/videos' "$gi" && grep -q 'cypress/screenshots' "$gi"
}

db_reset_is_callable() {
  local root="$1"
  local f="${root}/src/db/scripts/reset.ts"
  [[ -f "$f" ]] || return 1
  grep -q 'resetDatabase\|TRUNCATE\|import.meta.main' "$f"
}

db_seed_is_callable() {
  local root="$1"
  local f="${root}/src/db/scripts/seed.ts"
  [[ -f "$f" ]] || return 1
  grep -q 'seedDatabase\|import.meta.main' "$f"
}
