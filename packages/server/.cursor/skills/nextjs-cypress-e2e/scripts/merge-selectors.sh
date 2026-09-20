#!/usr/bin/env bash
# Upsert entity selector block into cypress/support/selectors.ts
# Usage: merge-selectors.sh --root <project> --entity <Entity>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"
# shellcheck source=lib/replacer.sh
source "${SCRIPT_DIR}/lib/replacer.sh"

SKILL_DIR="$(skill_dir_from_scripts "$SCRIPT_DIR")"
ROOT=""
ENTITY=""

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
    --entity)
      [[ $# -ge 2 ]] || die "--entity requires a name"
      ENTITY="$2"
      shift 2
      ;;
    --entity=*)
      ENTITY="${1#--entity=}"
      shift
      ;;
    --help|-h)
      echo "Usage: merge-selectors.sh --root <project> --entity <Entity>"
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROOT" ]] || die "Missing --root <project>"
[[ -n "$ENTITY" ]] || die "Missing --entity <Entity>"
ROOT="$(cd "$ROOT" && pwd)"
validate_root "$ROOT"
validate_entity "$ENTITY"

SEL_FILE="${ROOT}/cypress/support/selectors.ts"
[[ -f "$SEL_FILE" ]] || die "Missing $SEL_FILE — run nextjs-cypress-setup first"

FRAG_SRC="${SKILL_DIR}/assets/templates/selectors-entity.ts.frag"
[[ -f "$FRAG_SRC" ]] || die "Missing fragment: $FRAG_SRC"

CAMEL=$(to_camel_case "$ENTITY")
BLOCK_KEY="${CAMEL}s"

FRAG=$(replace_placeholders "$(cat "$FRAG_SRC")" "$ENTITY")

python3 - "$SEL_FILE" "$BLOCK_KEY" "$FRAG" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
frag = sys.argv[3].rstrip() + "\n"

text = path.read_text()

# Match existing block: key: { ... },
pattern = re.compile(
    rf"^  {re.escape(key)}:\s*\{{.*?\n  \}},?\n",
    re.M | re.S,
)

if pattern.search(text):
    text = pattern.sub(frag if frag.endswith("\n") else frag + "\n", text, count=1)
    path.write_text(text)
    print(f"Updated selectors block: {key}")
else:
    # Insert before closing `} as const`
    m = re.search(r"\n\}\s*as\s+const\s*;?\s*$", text)
    if not m:
        raise SystemExit("Error: could not find `} as const` in selectors.ts")
    # Ensure auth block ends with comma
    before = text[: m.start()]
    if not before.rstrip().endswith(","):
        # add comma after last property block
        before = re.sub(r"(\n  \})(\s*)$", r"\1,\2", before, count=1)
        if not before.rstrip().endswith(","):
            raise SystemExit("Error: could not add trailing comma before new block")
    path.write_text(before + "\n" + frag + text[m.start() :])
    print(f"Inserted selectors block: {key}")
PY

echo "merge-selectors done"
