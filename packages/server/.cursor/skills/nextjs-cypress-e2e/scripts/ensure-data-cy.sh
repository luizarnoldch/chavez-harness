#!/usr/bin/env bash
# Inject data-cy attributes into List / FormCreate / FormUpdate if missing.
# Usage: ensure-data-cy.sh --root <project> --entity <Entity>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/helpers.sh
source "${SCRIPT_DIR}/lib/helpers.sh"

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
      echo "Usage: ensure-data-cy.sh --root <project> --entity <Entity>"
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

KEBAB=$(to_kebab_case "$ENTITY")
PASCAL=$(to_pascal_case "$ENTITY")
CAMEL=$(to_camel_case "$ENTITY")

LIST="${ROOT}/src/features/${KEBAB}/components/${PASCAL}List/index.tsx"
CREATE="${ROOT}/src/features/${KEBAB}/components/${PASCAL}FormCreate.tsx"
UPDATE="${ROOT}/src/features/${KEBAB}/components/${PASCAL}FormUpdate.tsx"

[[ -f "$LIST" ]] || die "Missing list: $LIST"
[[ -f "$CREATE" ]] || die "Missing create form: $CREATE"
[[ -f "$UPDATE" ]] || die "Missing update form: $UPDATE"

# Fast path: all required markers already present
missing=0
while IFS= read -r marker; do
  [[ -n "$marker" ]] || continue
  if ! grep -q "$marker" "$LIST" "$CREATE" "$UPDATE" 2>/dev/null; then
    missing=$((missing + 1))
  fi
done < <(required_data_cy_markers "$KEBAB")

if [[ "$missing" -eq 0 ]]; then
  echo "OK: all required data-cy markers already present"
  exit 0
fi

python3 - "$LIST" "$CREATE" "$UPDATE" "$KEBAB" "$CAMEL" <<'PY'
import re
import sys
from pathlib import Path

list_p, create_p, update_p = map(Path, sys.argv[1:4])
kebab, camel = sys.argv[4], sys.argv[5]


def has(path: Path, s: str) -> bool:
    return s in path.read_text()


def add_attr(path: Path, tag_pattern: str, attr: str, *, which: int = 0) -> bool:
    """Insert attr into the Nth opening tag matching tag_pattern if attr key absent."""
    text = path.read_text()
    key = attr.split("=", 1)[0]
    if key in text and attr.split("=", 1)[1].strip('"') in text:
        # value already present
        if attr.split("=", 1)[1].strip('"') in text:
            print(f"OK: {path.name} has {attr}")
            return False
    matches = list(re.finditer(tag_pattern, text))
    if which >= len(matches):
        print(f"WARN: no tag match for {attr} in {path.name}")
        return False
    m = matches[which]
    tag = m.group(0)
    if key in tag and attr.split("=", 1)[1].strip('"') in tag:
        print(f"OK: {path.name} tag already has {attr}")
        return False
    if tag.endswith("/>"):
        new_tag = tag[:-2].rstrip() + f" {attr} />"
    else:
        new_tag = tag[:-1].rstrip() + f" {attr}>"
    path.write_text(text[: m.start()] + new_tag + text[m.end() :])
    print(f"Patched: {path.name} ← {attr}")
    return True


def add_attr_near_label(path: Path, label: str, attr: str) -> bool:
    text = path.read_text()
    value = attr.split("=", 1)[1].strip('"')
    if value in text:
        print(f"OK: {path.name} has {value}")
        return False
    for m in re.finditer(r"<button\b[^>]*>", text):
        window = text[m.start() : m.start() + 240]
        if re.search(label, window, re.I):
            tag = m.group(0)
            new_tag = tag[:-1].rstrip() + f" {attr}>"
            path.write_text(text[: m.start()] + new_tag + text[m.end() :])
            print(f"Patched: {path.name} ← {attr} (near {label})")
            return True
    print(f"WARN: button '{label}' not found in {path.name} for {attr}")
    return False


# --- List ---
if not has(list_p, f'data-cy-{kebab}-list'):
    add_attr(
        list_p,
        r'<div\b[^>]*className="grid gap-4"[^>]*>',
        f'data-cy-{kebab}-list="{kebab}-list"',
    )

if f'create-{kebab}-btn' not in list_p.read_text():
    add_attr_near_label(
        list_p,
        r"Create",
        f'data-cy-submit-create-{kebab}-btn="create-{kebab}-btn"',
    )

text = list_p.read_text()
if f'data-cy-{kebab}-row' not in text:
    m = re.search(r"<tbody>[\s\S]*?(<tr\b[^>]*>)", text)
    if m:
        tag = m.group(1)
        new_tag = (
            tag[:-1].rstrip()
            + f' data-cy-{kebab}-row="{kebab}-row" data-cy-{kebab}-id={{{camel}.id}}>'
        )
        list_p.write_text(text[: m.start(1)] + new_tag + text[m.end(1) :])
        print(f"Patched: {list_p.name} ← row")
    else:
        print(f"WARN: no tbody row in {list_p.name}")

text = list_p.read_text()
if f'data-cy-{kebab}-title' not in text:
    m = re.search(rf"(<td\b[^>]*>)(\s*\{{{camel}\.title\}})", text)
    if m:
        tag = m.group(1)
        new_tag = tag[:-1].rstrip() + f' data-cy-{kebab}-title="{kebab}-title">'
        list_p.write_text(text[: m.start(1)] + new_tag + text[m.end(1) :])
        print(f"Patched: {list_p.name} ← title")
    else:
        # first td in mapped row
        print(f"WARN: title cell pattern not found — add data-cy-{kebab}-title manually if needed")

add_attr_near_label(list_p, r"Edit", f'data-cy-submit-edit-{kebab}-btn="{kebab}-edit-btn"')
add_attr_near_label(list_p, r"Delete", f'data-cy-submit-delete-{kebab}-btn="{kebab}-delete-btn"')

# --- Create ---
if not has(create_p, f"data-cy-submit-create-{kebab}-form"):
    add_attr(
        create_p,
        r"<form\b[^>]*>",
        f'data-cy-submit-create-{kebab}-form="create-{kebab}-form"',
    )

text = create_p.read_text()
if f"data-cy-create-{kebab}-title-input" not in text:
    m = re.search(r"<input\b[^>]*>", text)
    if m:
        tag = m.group(0)
        attr = f'data-cy-create-{kebab}-title-input="{kebab}-title-input"'
        new_tag = (tag[:-2].rstrip() + f" {attr} />") if tag.endswith("/>") else (tag[:-1].rstrip() + f" {attr}>")
        create_p.write_text(text[: m.start()] + new_tag + text[m.end() :])
        print(f"Patched: {create_p.name} ← title input")

add_attr_near_label(create_p, r"Cancel", f'data-cy-create-{kebab}-cancel-btn="create-{kebab}-cancel"')
# Submit Create button (value create-*-submit)
if f'create-{kebab}-submit' not in create_p.read_text():
    add_attr_near_label(
        create_p,
        r"Creating|Create",
        f'data-cy-submit-create-{kebab}-btn="create-{kebab}-submit"',
    )

# --- Update ---
if not has(update_p, f"data-cy-update-{kebab}-form"):
    add_attr(
        update_p,
        r"<form\b[^>]*>",
        f'data-cy-update-{kebab}-form="update-{kebab}-form"',
    )

text = update_p.read_text()
if f"data-cy-update-{kebab}-title-input" not in text:
    # prefer non-checkbox input
    m = re.search(r'<input\b(?![^>]*type=["\']checkbox["\'])[^>]*>', text)
    if not m:
        m = re.search(r"<input\b[^>]*>", text)
    if m:
        tag = m.group(0)
        attr = f'data-cy-update-{kebab}-title-input="{kebab}-title-input"'
        new_tag = (tag[:-2].rstrip() + f" {attr} />") if tag.endswith("/>") else (tag[:-1].rstrip() + f" {attr}>")
        update_p.write_text(text[: m.start()] + new_tag + text[m.end() :])
        print(f"Patched: {update_p.name} ← title input")

add_attr_near_label(update_p, r"Cancel", f'data-cy-update-{kebab}-cancel-btn="update-{kebab}-cancel"')
if f"update-{kebab}-submit" not in update_p.read_text():
    add_attr_near_label(
        update_p,
        r"Saving|Save",
        f'data-cy-update-{kebab}-submit="update-{kebab}-submit"',
    )
PY

echo "ensure-data-cy done"
