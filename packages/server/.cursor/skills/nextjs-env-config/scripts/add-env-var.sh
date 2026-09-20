#!/usr/bin/env bash
# Add a new env var to src/lib/config.ts and append-only sync .env / .env.example.
# Does not rewrite existing .env values. Wires client only if still unwired.
# Usage: add-env-var.sh --root <project> --key KEY [--value VALUE] [--zod EXPR] [--config-key camel]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

ROOT=""
KEY=""
VALUE=""
EXAMPLE_VALUE=""
ZOD_EXPR=""
CONFIG_KEY=""

show_help() {
  cat <<EOF
Add env var to config.ts + append-only env files

Usage:
  $(basename "$0") --root <project> --key KEY [options]

Options:
  --root <path>           Project root
  --key KEY               SCREAMING_SNAKE env name (required)
  --value VALUE           Default for .env and Zod .default() if applicable
  --example-value VALUE   Value written to .env.example (default: --value)
  --zod EXPR              Zod chain after the key, e.g. 'z.string().optional().default("")'
                          Default: z.string().optional().default("<value>")
  --config-key NAME       camelCase export name (default: derived from KEY)
  -h, --help

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
    --key)
      [[ $# -ge 2 ]] || die "--key requires a name"
      KEY="$2"
      shift 2
      ;;
    --key=*)
      KEY="${1#--key=}"
      shift
      ;;
    --value)
      [[ $# -ge 2 ]] || die "--value requires a value"
      VALUE="$2"
      shift 2
      ;;
    --value=*)
      VALUE="${1#--value=}"
      shift
      ;;
    --example-value)
      [[ $# -ge 2 ]] || die "--example-value requires a value"
      EXAMPLE_VALUE="$2"
      shift 2
      ;;
    --example-value=*)
      EXAMPLE_VALUE="${1#--example-value=}"
      shift
      ;;
    --zod)
      [[ $# -ge 2 ]] || die "--zod requires an expression"
      ZOD_EXPR="$2"
      shift 2
      ;;
    --zod=*)
      ZOD_EXPR="${1#--zod=}"
      shift
      ;;
    --config-key)
      [[ $# -ge 2 ]] || die "--config-key requires a name"
      CONFIG_KEY="$2"
      shift 2
      ;;
    --config-key=*)
      CONFIG_KEY="${1#--config-key=}"
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
[[ -n "$KEY" ]] || die "Missing --key KEY. Run with --help."
[[ "$KEY" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || die "Invalid env key: $KEY"

ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"

CONFIG_TS="${ROOT}/src/lib/config.ts"
[[ -f "$CONFIG_TS" ]] || die "Missing $CONFIG_TS — run bootstrap.sh first"

if [[ -z "$CONFIG_KEY" ]]; then
  CONFIG_KEY="$(to_camel_case "$KEY")"
fi

if [[ -z "$ZOD_EXPR" ]]; then
  # Escape for embedding in TS string default
  esc_value="${VALUE//\\/\\\\}"
  esc_value="${esc_value//\"/\\\"}"
  ZOD_EXPR="z.string().optional().default(\"${esc_value}\")"
fi

if [[ -z "$EXAMPLE_VALUE" ]]; then
  EXAMPLE_VALUE="$VALUE"
fi

python3 - "$CONFIG_TS" "$KEY" "$CONFIG_KEY" "$ZOD_EXPR" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
config_key = sys.argv[3]
zod_expr = sys.argv[4]
text = path.read_text()

if f"{key}:" in text or f"parseEnv.{key}" in text:
    print(f"config.ts already has {key} — skip schema edit")
    sys.exit(0)

schema_line = f"  {key}: {zod_expr},\n"
config_line = f"  {config_key}: parseEnv.{key},\n"

# Insert before closing of z.object({ ... });
marker_schema = "});\n\nconst parseEnv"
if marker_schema not in text:
    print("Error: could not find envSchema closing in config.ts", file=sys.stderr)
    sys.exit(1)
# Insert before the `});` that precedes parseEnv
idx = text.index(marker_schema)
# find last newline before });
insert_at = text.rfind("\n", 0, idx)
# We need to insert before `});`
close_at = text.rfind("});", 0, idx + 3)
if close_at < 0:
    print("Error: could not locate schema close", file=sys.stderr)
    sys.exit(1)
# Ensure previous line ends cleanly
text = text[:close_at] + schema_line + text[close_at:]

marker_config = "};\n\nexport default config"
if marker_config not in text:
    # try without blank line
    marker_config = "};\nexport default config"
if marker_config not in text:
    print("Error: could not find config object close in config.ts", file=sys.stderr)
    sys.exit(1)
close_cfg = text.rfind("};", 0, text.index("export default config"))
if close_cfg < 0:
    print("Error: could not locate config close", file=sys.stderr)
    sys.exit(1)
text = text[:close_cfg] + config_line + text[close_cfg:]

path.write_text(text)
print(f"Added {key} → config.{config_key} in config.ts")
PY

bash "${SCRIPT_DIR}/sync-env-key.sh" --root "$ROOT" --key "$KEY" \
  --value "$VALUE" --example-value "$EXAMPLE_VALUE"

# Ensure wire if client still on VERCEL_URL pattern (idempotent)
if [[ -f "${ROOT}/src/trpc/client.tsx" ]]; then
  bash "${SCRIPT_DIR}/wire-trpc-client.sh" --root "$ROOT"
fi
