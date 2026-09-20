#!/usr/bin/env bash
# Shared helpers for feature-management skill scripts.
# shellcheck shell=bash

FEATURES_FILE="FEATURES.yml"
ARCHIVE_REL="features/ARCHIVE.yml"
SPRINTS_REL="features/sprints"
CHANGES_LOG_REL="features/changes.log"

VALID_STATUSES="draft|in_progress|testing|blocked|done|deployed|archived"
ACTIVE_STATUSES="draft|in_progress|testing|blocked|done|deployed"
VALID_EXECUTION="sequential|parallel"

# Pinned jq release for reproducible vendor downloads
JQ_RELEASE_TAG="jq-1.8.1"
JQ_RELEASE_BASE="https://github.com/jqlang/jq/releases/download/${JQ_RELEASE_TAG}"

die() {
  local code=1
  if [[ "${1:-}" =~ ^[0-9]+$ ]] && [[ $# -ge 2 ]]; then
    code="$1"
    shift
  fi
  echo "Error: $*" >&2
  exit "$code"
}

feature_root() {
  echo "${FEATURE_ROOT:-$(pwd)}"
}

skill_dir() {
  echo "${FEATURE_SKILL_DIR:?FEATURE_SKILL_DIR is not set}"
}

features_path() {
  echo "$(feature_root)/${FEATURES_FILE}"
}

archive_path() {
  echo "$(feature_root)/${ARCHIVE_REL}"
}

sprints_dir() {
  echo "$(feature_root)/${SPRINTS_REL}"
}

# Path to per-sprint archive file: features/sprints/{N}.yml
sprint_archive_path() {
  local n="${1:?sprint number required}"
  echo "$(sprints_dir)/${n}.yml"
}

changes_log_path() {
  echo "$(feature_root)/${CHANGES_LOG_REL}"
}

# Rename legacy uppercase-extension paths to .yml when present (one-way migration).
migrate_legacy_yml_extensions() {
  local root legacy modern legacy_ext="YML"
  root="$(feature_root)"

  legacy="${root}/FEATURES.${legacy_ext}"
  modern="${root}/FEATURES.yml"
  if [[ -f "$legacy" && ! -e "$modern" ]]; then
    mv "$legacy" "$modern"
    echo "Migrated FEATURES.${legacy_ext} -> FEATURES.yml" >&2
  fi

  legacy="${root}/features/ARCHIVE.${legacy_ext}"
  modern="${root}/features/ARCHIVE.yml"
  if [[ -f "$legacy" && ! -e "$modern" ]]; then
    mv "$legacy" "$modern"
    echo "Migrated features/ARCHIVE.${legacy_ext} -> features/ARCHIVE.yml" >&2
  fi
}

utc_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Split comma-separated IDs into newline-separated list (trimmed, non-empty).
split_csv() {
  local input="${1:-}"
  [[ -z "$input" ]] && return 0
  local IFS=','
  local -a parts
  read -ra parts <<<"$input"
  local p
  for p in "${parts[@]}"; do
    p="${p#"${p%%[![:space:]]*}"}"
    p="${p%"${p##*[![:space:]]}"}"
    [[ -n "$p" ]] && printf '%s\n' "$p"
  done
}

_jq_vendor_dir() {
  echo "$(skill_dir)/scripts/.vendor/bin"
}

_jq_detect_asset() {
  # stdout: "asset_name|local_filename"
  local uname_s uname_m
  uname_s="$(uname -s 2>/dev/null || echo unknown)"
  uname_m="$(uname -m 2>/dev/null || echo unknown)"

  case "$uname_s" in
    Linux)
      case "$uname_m" in
        x86_64|amd64) echo "jq-linux-amd64|jq" ;;
        aarch64|arm64) echo "jq-linux-arm64|jq" ;;
        *) die 2 "Unsupported Linux arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    Darwin)
      case "$uname_m" in
        x86_64) echo "jq-macos-amd64|jq" ;;
        arm64) echo "jq-macos-arm64|jq" ;;
        *) die 2 "Unsupported macOS arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      case "$uname_m" in
        x86_64|amd64) echo "jq-windows-amd64.exe|jq.exe" ;;
        aarch64|arm64) echo "jq-windows-arm64.exe|jq.exe" ;;
        *) die 2 "Unsupported Windows arch for jq auto-install: ${uname_m}" ;;
      esac
      ;;
    *)
      die 2 "Unsupported OS for jq auto-install: ${uname_s}. Install jq manually."
      ;;
  esac
}

_jq_install_hints() {
  cat >&2 <<'HINTS'
Install jq manually, then re-run:
  Linux:   sudo apt-get install -y jq   OR   sudo dnf install -y jq   OR   sudo pacman -S jq
  Windows: winget install jqlang.jq     OR   choco install jq
  macOS:   brew install jq
HINTS
}

_jq_download() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --retry-delay 1 -o "$dest" "$url"
    return $?
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q -O "$dest" "$url"
    return $?
  fi
  return 1
}

# Ensure jq is available. Prefers system jq, then skill-vendored binary,
# then downloads from GitHub releases into scripts/.vendor/bin (no sudo).
ensure_jq() {
  if command -v jq >/dev/null 2>&1; then
    return 0
  fi

  local vdir asset_info asset local_name dest url
  vdir="$(_jq_vendor_dir)"
  mkdir -p "$vdir"

  if [[ -x "${vdir}/jq" ]]; then
    export PATH="${vdir}:${PATH}"
    command -v jq >/dev/null 2>&1 && return 0
  fi
  if [[ -x "${vdir}/jq.exe" ]]; then
    export PATH="${vdir}:${PATH}"
    command -v jq >/dev/null 2>&1 && return 0
  fi

  echo "jq not found; downloading ${JQ_RELEASE_TAG} into ${vdir} ..." >&2
  asset_info="$(_jq_detect_asset)"
  asset="${asset_info%%|*}"
  local_name="${asset_info##*|}"
  dest="${vdir}/${local_name}"
  url="${JQ_RELEASE_BASE}/${asset}"

  if ! _jq_download "$url" "$dest"; then
    echo "Error: failed to download jq from ${url}" >&2
    _jq_install_hints
    exit 2
  fi
  chmod +x "$dest" 2>/dev/null || true

  export PATH="${vdir}:${PATH}"

  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq downloaded to ${dest} but is not on PATH." >&2
    _jq_install_hints
    exit 2
  fi

  jq --version >&2 || true
  return 0
}

# Back-compat alias
require_jq() {
  ensure_jq
}

# Validate YYYY-MM-DD calendar date (basic).
is_iso_date() {
  local d="${1:-}"
  [[ "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || return 1
  local y="${d:0:4}" m="${d:5:2}" day="${d:8:2}"
  # Force decimal (avoid octal parse of 08/09)
  m=$((10#$m))
  day=$((10#$day))
  y=$((10#$y))
  [[ "$m" -ge 1 && "$m" -le 12 ]] || return 1
  [[ "$day" -ge 1 && "$day" -le 31 ]] || return 1
  if date -d "$d" +%Y-%m-%d >/dev/null 2>&1; then
    [[ "$(date -d "$d" +%Y-%m-%d)" == "$d" ]] || return 1
  fi
  return 0
}

# Return 0 if end >= start (both YYYY-MM-DD).
date_range_ok() {
  local start="$1" end="$2"
  [[ "$end" > "$start" || "$end" == "$start" ]]
}

is_acronym() {
  local a="${1:-}"
  [[ "$a" =~ ^[A-Z]{3}$ ]]
}

# Derive 3-letter acronym from project title (plan algorithm).
acronym_from_title() {
  local title="${1:-}"
  local normalized words=() w i c
  # Keep letters/numbers/spaces, uppercase
  normalized="$(printf '%s' "$title" | tr '[:lower:]' '[:upper:]' | sed 's/[^A-Z0-9 ]/ /g' | tr -s ' ' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  # Drop digit-only tokens for letter acronym; keep alnum words but acronym uses letters only from words
  read -ra words <<<"$normalized"
  local letters=()
  local word letter_part
  for word in "${words[@]}"; do
    letter_part="$(printf '%s' "$word" | sed 's/[^A-Z]//g')"
    [[ -n "$letter_part" ]] && letters+=("$letter_part")
  done

  local out=""
  local n="${#letters[@]}"
  if [[ "$n" -ge 3 ]]; then
    out="${letters[0]:0:1}${letters[1]:0:1}${letters[2]:0:1}"
  elif [[ "$n" -eq 2 ]]; then
    # First letter of w1, second letter of w1, first letter of w2 (Novetec Shop → NOS)
    out="${letters[0]:0:1}${letters[0]:1:1}${letters[1]:0:1}"
  elif [[ "$n" -eq 1 ]]; then
    out="${letters[0]:0:3}"
  fi

  out="$(printf '%s' "$out" | sed 's/[^A-Z]//g')"
  while [[ ${#out} -lt 3 ]]; do
    out="${out}X"
  done
  out="${out:0:3}"
  is_acronym "$out" || die 2 "Could not derive acronym from title: ${title}"
  printf '%s\n' "$out"
}

# Feature ID pattern for a given acronym: ACRONYM-N (no leading zeros).
feature_id_matches_acronym() {
  local id="$1" acronym="$2"
  [[ "$id" =~ ^${acronym}-[1-9][0-9]*$ ]]
}
