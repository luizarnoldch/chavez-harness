#!/usr/bin/env bash
# Validate auth frontend: assets, protectedProcedure, auth router, proxy, no authClient in forms.
# Usage: validate.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ASSETS_DIR="${SKILL_DIR}/assets"
ROOT=""

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
      echo "Usage: validate.sh --root <project>"
      echo "Compares auth frontend files to assets/ and checks tRPC/proxy wiring."
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

ERRORS=0
err() {
  echo "FAIL: $*" >&2
  ERRORS=$((ERRORS + 1))
}
ok() {
  echo "OK: $*"
}

while IFS='|' read -r asset_rel dest_rel; do
  [[ -n "$asset_rel" ]] || continue
  src="${ASSETS_DIR}/${asset_rel}"
  dest="${ROOT}/${dest_rel}"
  if [[ ! -e "$dest" ]]; then
    err "missing $dest_rel"
    continue
  fi
  # proxy.ts: allow minor local edits; structural checks below are authoritative
  if [[ "$dest_rel" == "src/proxy.ts" ]]; then
    if cmp -s "$src" "$dest"; then
      ok "$dest_rel matches asset"
    else
      ok "$dest_rel present (differs from asset — structural checks apply)"
    fi
    continue
  fi
  if ! cmp -s "$src" "$dest"; then
    err "differs from asset: $dest_rel"
    continue
  fi
  ok "$dest_rel matches asset"
done < <(file_map)

if init_has_protected_procedure "$ROOT"; then
  ok "src/trpc/init.ts has protectedProcedure"
else
  err "src/trpc/init.ts missing protectedProcedure (run patch-init.sh)"
fi

if app_router_has_auth "$ROOT"; then
  ok "src/trpc/routers/_app.ts mounts authRouter"
else
  err "src/trpc/routers/_app.ts missing authRouter (run patch-app-router.sh)"
fi

if [[ -f "${ROOT}/src/proxy.ts" ]] && grep -q 'auth.api.getSession' "${ROOT}/src/proxy.ts" \
  && grep -q '/sign-in' "${ROOT}/src/proxy.ts" \
  && grep -q '/dashboard' "${ROOT}/src/proxy.ts"; then
  ok "src/proxy.ts has session guards"
else
  err "src/proxy.ts missing session guards / matcher routes"
fi

if forms_use_auth_client "$ROOT"; then
  err "auth forms import authClient — UI must use tRPC → auth.api only"
else
  ok "auth forms do not use authClient"
fi

if better_auth_foundation_present "$ROOT"; then
  ok "better-auth foundation + api/trpc present"
else
  err "missing better-auth foundation or src/app/api/trpc — run prior skills first"
fi

if config_has_better_auth "$ROOT"; then
  ok "config has betterAuthUrl + betterAuthSecret"
else
  err "config missing betterAuth* — run nextjs-better-auth-setup sync-env"
fi

if [[ "$ERRORS" -gt 0 ]]; then
  echo "validate FAILED ($ERRORS error(s))" >&2
  exit 1
fi
echo "validate PASSED"
