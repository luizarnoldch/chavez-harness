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

# Canonical asset → destination relative paths (under ROOT)
# Prints: ASSET_REL|DEST_REL
file_map() {
  cat <<'EOF'
features/auth/components/AuthSignInForm.tsx|src/features/auth/components/AuthSignInForm.tsx
features/auth/components/AuthSignUpForm.tsx|src/features/auth/components/AuthSignUpForm.tsx
features/auth/hooks/useSignIn.tsx|src/features/auth/hooks/useSignIn.tsx
features/auth/hooks/useSignUp.tsx|src/features/auth/hooks/useSignUp.tsx
features/auth/hooks/useSignOut.tsx|src/features/auth/hooks/useSignOut.tsx
features/auth/schemas/auth.schema.ts|src/features/auth/schemas/auth.schema.ts
features/auth/server/auth.repository.ts|src/features/auth/server/auth.repository.ts
features/auth/server/auth.service.ts|src/features/auth/server/auth.service.ts
features/auth/server/auth.router.ts|src/features/auth/server/auth.router.ts
features/auth/views/SignInView.tsx|src/features/auth/views/SignInView.tsx
features/auth/views/SignUpView.tsx|src/features/auth/views/SignUpView.tsx
app/(auth)/layout.tsx|src/app/(auth)/layout.tsx
app/(auth)/sign-in/page.tsx|src/app/(auth)/sign-in/page.tsx
app/(auth)/sign-up/page.tsx|src/app/(auth)/sign-up/page.tsx
app/dashboard/page.tsx|src/app/dashboard/page.tsx
proxy.ts|src/proxy.ts
EOF
}

init_has_protected_procedure() {
  local root="$1"
  local init="${root}/src/trpc/init.ts"
  [[ -f "$init" ]] || return 1
  grep -q 'protectedProcedure' "$init" && grep -q 'auth.api.getSession' "$init"
}

app_router_has_auth() {
  local root="$1"
  local app="${root}/src/trpc/routers/_app.ts"
  [[ -f "$app" ]] || return 1
  grep -q 'authRouter' "$app" && grep -qE 'auth:[[:space:]]*authRouter' "$app"
}

forms_use_auth_client() {
  local root="$1"
  local forms="${root}/src/features/auth/components"
  [[ -d "$forms" ]] || return 1
  grep -rqE 'auth-client|authClient|createAuthClient' "$forms" 2>/dev/null
}

better_auth_foundation_present() {
  local root="$1"
  [[ -f "${root}/src/lib/auth/index.ts" ]] \
    && [[ -f "${root}/src/app/api/auth/[...all]/route.ts" ]] \
    && [[ -f "${root}/src/app/api/trpc/[trpc]/route.ts" ]]
}

config_has_better_auth() {
  local root="$1"
  local config="${root}/src/lib/config.ts"
  [[ -f "$config" ]] || return 1
  grep -q 'betterAuthUrl' "$config" && grep -q 'betterAuthSecret' "$config"
}
