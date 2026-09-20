#!/usr/bin/env bash
# Bootstrap env config after nextjs-trpc-setup validate PASS.
# Creates config.ts, syncs base env keys (append-only), wires client.tsx, ensures gitignore.
# Do NOT re-run nextjs-trpc-setup validate.sh after this.
# Usage: bootstrap.sh --root <project> [--force-config]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ROOT=""
FORCE_CONFIG=false

show_help() {
  cat <<EOF
Bootstrap src/lib/config + env files + tRPC client wire

Usage:
  $(basename "$0") --root <project> [--force-config]

Options:
  --root <path>     Absolute (or resolvable) Next.js project root with src/
  --force-config    Overwrite src/lib/config.ts from skill asset
  -h, --help

Order (run after nextjs-trpc-setup validate PASS):
  1. ensure-gitignore-env.sh
  2. copy assets/config.ts → src/lib/config.ts (if missing or --force-config)
  3. sync base keys to .env.example and .env (append-only)
  4. wire-trpc-client.sh

Never re-run nextjs-trpc-setup/validate.sh after step 4.

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
    --force-config)
      FORCE_CONFIG=true
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
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

ASSET_CONFIG="${SKILL_DIR}/assets/config.ts"
ASSET_ENV_EXAMPLE="${SKILL_DIR}/assets/env.example"
[[ -f "$ASSET_CONFIG" ]] || die "Missing asset: $ASSET_CONFIG"
[[ -f "$ASSET_ENV_EXAMPLE" ]] || die "Missing asset: $ASSET_ENV_EXAMPLE"

echo "==> ensure gitignore env rules"
bash "${SCRIPT_DIR}/ensure-gitignore-env.sh" --root "$ROOT"

LIB_DIR="${ROOT}/src/lib"
CONFIG_TS="${LIB_DIR}/config.ts"
mkdir -p "$LIB_DIR"

if [[ -f "$CONFIG_TS" && "$FORCE_CONFIG" != true ]]; then
  echo "config.ts already exists — leave in place (use --force-config to replace)"
else
  cp "$ASSET_CONFIG" "$CONFIG_TS"
  echo "Installed $CONFIG_TS from skill asset"
fi

# Sync every KEY= from asset env.example (append-only)
echo "==> sync base env keys (append-only)"
while IFS= read -r line || [[ -n "$line" ]]; do
  # skip blank / comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    bash "${SCRIPT_DIR}/sync-env-key.sh" --root "$ROOT" --key "$key" \
      --value "$val" --example-value "$val"
  fi
done <"$ASSET_ENV_EXAMPLE"

echo "==> wire tRPC client to config"
bash "${SCRIPT_DIR}/wire-trpc-client.sh" --root "$ROOT"

echo ""
echo "Bootstrap complete."
echo "Do NOT re-run nextjs-trpc-setup/scripts/validate.sh — client.tsx intentionally diverges from trpc assets."
