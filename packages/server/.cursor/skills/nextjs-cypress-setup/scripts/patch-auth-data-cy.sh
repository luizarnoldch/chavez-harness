#!/usr/bin/env bash
# Ensure AuthSignIn/Up forms have data-cy attributes for Cypress.
# Usage: patch-auth-data-cy.sh --root <project>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

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
      echo "Usage: patch-auth-data-cy.sh --root <project>"
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

SIGN_IN="${ROOT}/src/features/auth/components/AuthSignInForm.tsx"
SIGN_UP="${ROOT}/src/features/auth/components/AuthSignUpForm.tsx"

[[ -f "$SIGN_IN" ]] || die "Missing AuthSignInForm: $SIGN_IN"
[[ -f "$SIGN_UP" ]] || die "Missing AuthSignUpForm: $SIGN_UP"

python3 - "$SIGN_IN" "$SIGN_UP" <<'PY'
import re
import sys
from pathlib import Path

sign_in, sign_up = Path(sys.argv[1]), Path(sys.argv[2])

def ensure_attr(path: Path, attr: str) -> bool:
    text = path.read_text()
    if attr in text:
        print(f"OK: {path.name} already has {attr.split('=')[0]}")
        return False
    # Insert after opening <form
    new, n = re.subn(
        r"(<form\b)",
        rf'\1\n          {attr}',
        text,
        count=1,
    )
    if n == 0:
        raise SystemExit(f"Error: no <form> found in {path}")
    path.write_text(new)
    print(f"Patched: {path.name} ← {attr}")
    return True

ensure_attr(sign_in, 'data-cy-submit-sign-in-form="sign-in-form"')
ensure_attr(sign_up, 'data-cy-submit-sign-up-form="sign-up-form"')
PY

echo "patch-auth-data-cy done"
