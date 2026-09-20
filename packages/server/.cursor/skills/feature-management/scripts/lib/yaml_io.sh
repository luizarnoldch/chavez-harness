#!/usr/bin/env bash
# YAML ↔ JSON for the feature-management registry schema only.
# shellcheck shell=bash

# --- string helpers ---

_yaml_json_encode_str() {
  jq -cn --arg s "$1" '$s'
}

_yaml_parse_scalar() {
  # stdout: JSON value (string/number/bool/[])
  local raw="$1"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"

  if [[ "$raw" == "[]" ]]; then
    echo '[]'
    return
  fi
  if [[ "$raw" == "true" || "$raw" == "false" ]]; then
    echo "$raw"
    return
  fi
  if [[ "$raw" =~ ^-?[0-9]+$ ]]; then
    echo "$raw"
    return
  fi
  # Strip surrounding quotes without regex (bash 5.3 =~ + quotes is fragile)
  if [[ "${raw:0:1}" == '"' && "${raw: -1}" == '"' && ${#raw} -ge 2 ]]; then
    raw="${raw:1:${#raw}-2}"
    raw="${raw//\\\"/\"}"
  elif [[ "${raw:0:1}" == "'" && "${raw: -1}" == "'" && ${#raw} -ge 2 ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  _yaml_json_encode_str "$raw"
}

_yaml_quote_str() {
  # Emit a double-quoted YAML string
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '"%s"' "$s"
}

# --- writer: JSON → YAML ---

_yaml_emit_str_list() {
  local indent="$1"
  local json_arr="$2"
  local len
  len="$(jq 'length' <<<"$json_arr")"
  if [[ "$len" -eq 0 ]]; then
    printf '[]\n'
    return
  fi
  printf '\n'
  local i item
  for ((i = 0; i < len; i++)); do
    item="$(jq -r --argjson i "$i" '.[$i]' <<<"$json_arr")"
    printf '%s- %s\n' "$indent" "$(_yaml_quote_str "$item")"
  done
}

_yaml_emit_feature() {
  local indent="$1"
  local feat="$2"
  local id name desc status locked archived_at sprint_n

  id="$(jq -r '.id // ""' <<<"$feat")"
  name="$(jq -r '.name // ""' <<<"$feat")"
  desc="$(jq -r '.short_description // ""' <<<"$feat")"
  status="$(jq -r '.status // ""' <<<"$feat")"
  locked="$(jq -r 'if .locked == true then "true" else "false" end' <<<"$feat")"
  sprint_n="$(jq -r '.sprint // empty' <<<"$feat")"

  printf '%s- id: %s\n' "$indent" "$(_yaml_quote_str "$id")"
  printf '%s  name: %s\n' "$indent" "$(_yaml_quote_str "$name")"
  printf '%s  short_description: %s\n' "$indent" "$(_yaml_quote_str "$desc")"
  printf '%s  status: %s\n' "$indent" "$(_yaml_quote_str "$status")"
  if [[ -n "$sprint_n" && "$sprint_n" != "null" ]]; then
    printf '%s  sprint: %s\n' "$indent" "$sprint_n"
  fi
  printf '%s  locked: %s\n' "$indent" "$locked"

  printf '%s  blocks: ' "$indent"
  _yaml_emit_str_list "${indent}    " "$(jq -c '.blocks // []' <<<"$feat")"

  printf '%s  blocked_by: ' "$indent"
  _yaml_emit_str_list "${indent}    " "$(jq -c '.blocked_by // []' <<<"$feat")"

  printf '%s  related_to: ' "$indent"
  _yaml_emit_str_list "${indent}    " "$(jq -c '.related_to // []' <<<"$feat")"

  local prds_len
  prds_len="$(jq '.prds // [] | length' <<<"$feat")"
  if [[ "$prds_len" -eq 0 ]]; then
    printf '%s  prds: []\n' "$indent"
  else
    printf '%s  prds:\n' "$indent"
    local j path order execution completed
    for ((j = 0; j < prds_len; j++)); do
      path="$(jq -r --argjson j "$j" '.prds[$j].path' <<<"$feat")"
      order="$(jq -r --argjson j "$j" '.prds[$j].order' <<<"$feat")"
      execution="$(jq -r --argjson j "$j" '.prds[$j].execution // "sequential"' <<<"$feat")"
      completed="$(jq -r --argjson j "$j" 'if (.prds[$j].completed == true) then "true" else "false" end' <<<"$feat")"
      printf '%s    - path: %s\n' "$indent" "$(_yaml_quote_str "$path")"
      printf '%s      order: %s\n' "$indent" "$order"
      printf '%s      execution: %s\n' "$indent" "$(_yaml_quote_str "$execution")"
      printf '%s      completed: %s\n' "$indent" "$completed"
    done
  fi

  if jq -e '.archived_at != null and .archived_at != ""' <<<"$feat" >/dev/null 2>&1; then
    archived_at="$(jq -r '.archived_at' <<<"$feat")"
    printf '%s  archived_at: %s\n' "$indent" "$(_yaml_quote_str "$archived_at")"
  fi
}

_yaml_emit_log() {
  local indent="$1"
  local log="$2"
  local ts action fid details
  ts="$(jq -r '.timestamp // ""' <<<"$log")"
  action="$(jq -r '.action // ""' <<<"$log")"
  fid="$(jq -r '.feature_id // ""' <<<"$log")"
  details="$(jq -r '.details // ""' <<<"$log")"
  printf '%s- timestamp: %s\n' "$indent" "$(_yaml_quote_str "$ts")"
  printf '%s  action: %s\n' "$indent" "$(_yaml_quote_str "$action")"
  printf '%s  feature_id: %s\n' "$indent" "$(_yaml_quote_str "$fid")"
  printf '%s  details: %s\n' "$indent" "$(_yaml_quote_str "$details")"
}

_yaml_emit_project_sprint() {
  local json="$1"
  local title acronym number start end closed_at
  title="$(jq -r '.project.title // ""' <<<"$json")"
  acronym="$(jq -r '.project.acronym // ""' <<<"$json")"
  number="$(jq -r '.sprint.number // 1' <<<"$json")"
  start="$(jq -r '.sprint.start // ""' <<<"$json")"
  end="$(jq -r '.sprint.end // ""' <<<"$json")"
  closed_at="$(jq -r '.sprint.closed_at // ""' <<<"$json")"
  printf 'project:\n'
  printf '  title: %s\n' "$(_yaml_quote_str "$title")"
  printf '  acronym: %s\n' "$(_yaml_quote_str "$acronym")"
  printf '\n'
  printf 'sprint:\n'
  printf '  number: %s\n' "$number"
  printf '  start: %s\n' "$(_yaml_quote_str "$start")"
  printf '  end: %s\n' "$(_yaml_quote_str "$end")"
  # closed_at only meaningful on per-sprint archive files; emit when key present or non-empty
  if jq -e '(.sprint | has("closed_at")) or ((.sprint.closed_at // "") != "")' <<<"$json" >/dev/null 2>&1; then
    printf '  closed_at: %s\n' "$(_yaml_quote_str "$closed_at")"
  fi
  printf '\n'
}

# json_to_yaml <json> <kind>
# kind: features → {project,sprint,features:[...]}
# kind: archive  → {project,sprint,archive:[...], logs?:[...]}
json_to_yaml() {
  local json="$1"
  local kind="$2"
  local len i

  _yaml_emit_project_sprint "$json"

  case "$kind" in
    features)
      len="$(jq '.features // [] | length' <<<"$json")"
      if [[ "$len" -eq 0 ]]; then
        printf 'features: []\n'
        return
      fi
      printf 'features:\n'
      for ((i = 0; i < len; i++)); do
        _yaml_emit_feature "  " "$(jq -c --argjson i "$i" '.features[$i]' <<<"$json")"
      done
      ;;
    archive)
      len="$(jq '.archive // [] | length' <<<"$json")"
      if [[ "$len" -eq 0 ]]; then
        printf 'archive: []\n'
      else
        printf 'archive:\n'
        for ((i = 0; i < len; i++)); do
          _yaml_emit_feature "  " "$(jq -c --argjson i "$i" '.archive[$i]' <<<"$json")"
        done
      fi
      # Omit empty legacy logs section unless present and non-empty
      len="$(jq '.logs // [] | length' <<<"$json")"
      if [[ "$len" -gt 0 ]]; then
        printf '\nlogs:\n'
        for ((i = 0; i < len; i++)); do
          _yaml_emit_log "  " "$(jq -c --argjson i "$i" '.logs[$i]' <<<"$json")"
        done
      fi
      ;;
    *)
      die 2 "json_to_yaml: unknown kind $kind"
      ;;
  esac
}

save_yaml_json() {
  local path="$1"
  local json="$2"
  local kind="$3"
  mkdir -p "$(dirname "$path")"
  {
    printf '# Managed by feature-management skill. Prefer CLI over hand-edits.\n'
    json_to_yaml "$json" "$kind"
  } >"$path"
}

# --- reader: YAML → JSON ---

# yaml_to_json <path> <kind>
# kind features → {"features":[...]}
# kind archive  → {"archive":[...],"logs":[...]}
yaml_to_json() {
  local path="$1"
  local kind="$2"

  if [[ ! -f "$path" ]]; then
    case "$kind" in
      features) echo '{"project":{"title":"","acronym":""},"sprint":{"number":1,"start":"","end":""},"features":[]}' ;;
      archive) echo '{"project":{"title":"","acronym":""},"sprint":{"number":1,"start":"","end":""},"archive":[],"logs":[]}' ;;
      *) die 2 "yaml_to_json: unknown kind $kind" ;;
    esac
    return
  fi

  local features='[]'
  local archive='[]'
  local logs='[]'
  local project='{"title":"","acronym":""}'
  local sprint='{"number":1,"start":"","end":""}'
  local section=""
  local current="null" # JSON object being built
  local pending_array="" # blocks|blocked_by|related_to
  local in_prd=0
  local prd="null"

  _flush_prd() {
    if [[ "$in_prd" -eq 1 && "$prd" != "null" ]]; then
      current="$(jq -c --argjson p "$prd" '.prds = ((.prds // []) + [$p])' <<<"$current")"
    fi
    in_prd=0
    prd="null"
  }

  _flush_current() {
    _flush_prd
    if [[ "$current" == "null" ]]; then
      pending_array=""
      return
    fi
    # Ensure required arrays exist + normalize PRD completed
    current="$(jq -c '
      .blocks = (.blocks // []) |
      .blocked_by = (.blocked_by // []) |
      .related_to = (.related_to // []) |
      .prds = ((.prds // []) | map(.completed = (if .completed == true then true else false end) | .execution = (.execution // "sequential")))
    ' <<<"$current")"
    case "$section" in
      features)
        features="$(jq -c --argjson f "$current" '. + [$f]' <<<"$features")"
        ;;
      archive)
        archive="$(jq -c --argjson f "$current" '. + [$f]' <<<"$archive")"
        ;;
      logs)
        logs="$(jq -c --argjson f "$current" '. + [$f]' <<<"$logs")"
        ;;
    esac
    current="null"
    pending_array=""
  }

  _start_feature() {
    _flush_current
    current='{"id":"","name":"","short_description":"","status":"draft","locked":false,"blocks":[],"blocked_by":[],"related_to":[],"prds":[]}'
    pending_array=""
    in_prd=0
    prd="null"
  }

  _start_log() {
    _flush_current
    current='{"timestamp":"","action":"","feature_id":"","details":""}'
    pending_array=""
  }

  _set_field() {
    local key="$1"
    local json_val="$2"
    current="$(jq -c --arg k "$key" --argjson v "$json_val" '.[$k] = $v' <<<"$current")"
  }

  local line stripped key val first
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Strip CR
    line="${line%$'\r'}"
    # Skip empty / comments / doc start
    stripped="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$stripped" ]] && continue
    [[ "$stripped" == \#* ]] && continue
    [[ "$stripped" == "---" ]] && continue

    # Top-level section headers only at column 0 (avoid feature field "sprint: N")
    if [[ "$line" == features:* || "$line" == archive:* || "$line" == logs:* || "$line" == project:* || "$line" == sprint:* ]]; then
      local sec_name="${stripped%%:*}"
      local sec_rest="${stripped#*:}"
      sec_rest="${sec_rest#"${sec_rest%%[![:space:]]*}"}"
      sec_rest="${sec_rest%"${sec_rest##*[![:space:]]}"}"
      _flush_current
      section="$sec_name"
      pending_array=""
      in_prd=0
      if [[ "$sec_rest" == "[]" || "$sec_rest" == "" ]]; then
        if [[ "$sec_rest" == "[]" ]]; then
          case "$section" in
            features) features='[]' ;;
            archive) archive='[]' ;;
            logs) logs='[]' ;;
          esac
        fi
      else
        die 2 "Unsupported top-level value for ${section} in ${path}"
      fi
      continue
    fi

    # List item start: "- key: value" or "- value" (string array item)
    if [[ "$stripped" == -* ]]; then
      first="${stripped#-}"
      first="${first#"${first%%[![:space:]]*}"}"

      # Parse "key: value" without relying on =~ capture under set -u
      key=""
      val=""
      if [[ "$first" == *:* ]]; then
        key="${first%%:*}"
        val="${first#*:}"
        key="${key%"${key##*[![:space:]]}"}"
        val="${val#"${val%%[![:space:]]*}"}"
        # Only treat as key:value if key looks like an identifier
        if [[ ! "$key" =~ ^[A-Za-z0-9_]+$ ]]; then
          key=""
          val=""
        fi
      fi

      # String-array continuation under pending_array
      if [[ -n "$pending_array" && "$current" != "null" && "$section" != "logs" ]]; then
        if [[ -z "$key" ]]; then
          local jv
          jv="$(_yaml_parse_scalar "$first")"
          current="$(jq -c --arg k "$pending_array" --argjson v "$jv" '.[$k] = ((.[$k] // []) + [$v])' <<<"$current")"
          continue
        fi
      fi

      if [[ -n "$key" ]]; then
        if [[ "$section" == "logs" ]]; then
          if [[ "$key" == "timestamp" ]]; then
            _start_log
            _set_field timestamp "$(_yaml_parse_scalar "$val")"
          else
            [[ "$current" == "null" ]] && _start_log
            _set_field "$key" "$(_yaml_parse_scalar "$val")"
          fi
          pending_array=""
          continue
        fi

        if [[ "$key" == "id" ]]; then
          _start_feature
          _set_field id "$(_yaml_parse_scalar "$val")"
          pending_array=""
          continue
        fi

        if [[ "$key" == "path" ]]; then
          _flush_prd
          in_prd=1
          prd="$(jq -cn --argjson path "$(_yaml_parse_scalar "$val")" \
            '{path:$path, order:0, execution:"sequential", completed:false}')"
          pending_array=""
          continue
        fi

        if [[ "$current" != "null" ]]; then
          if [[ "$val" == "[]" ]]; then
            _set_field "$key" '[]'
            pending_array=""
          elif [[ -z "$val" ]]; then
            pending_array="$key"
            _set_field "$key" '[]'
          else
            _set_field "$key" "$(_yaml_parse_scalar "$val")"
            pending_array=""
          fi
        fi
        continue
      fi

      # Bare "- value" without key
      if [[ -n "$pending_array" && "$current" != "null" ]]; then
        current="$(jq -c --arg k "$pending_array" --argjson v "$(_yaml_parse_scalar "$first")" \
          '.[$k] = ((.[$k] // []) + [$v])' <<<"$current")"
      fi
      continue
    fi

    # Indented key: value
    if [[ "$stripped" == *:* ]]; then
      key="${stripped%%:*}"
      val="${stripped#*:}"
      key="${key%"${key##*[![:space:]]}"}"
      val="${val#"${val%%[![:space:]]*}"}"
      if [[ ! "$key" =~ ^[A-Za-z0-9_]+$ ]]; then
        continue
      fi

      # Nested under project / sprint metadata
      if [[ "$section" == "project" ]]; then
        case "$key" in
          title|acronym)
            project="$(jq -c --arg k "$key" --argjson v "$(_yaml_parse_scalar "$val")" '.[$k]=$v' <<<"$project")"
            ;;
        esac
        continue
      fi
      if [[ "$section" == "sprint" ]]; then
        case "$key" in
          number)
            sprint="$(jq -c --argjson v "$(_yaml_parse_scalar "$val")" '.number=$v' <<<"$sprint")"
            ;;
          start|end|closed_at)
            sprint="$(jq -c --arg k "$key" --argjson v "$(_yaml_parse_scalar "$val")" '.[$k]=$v' <<<"$sprint")"
            ;;
        esac
        continue
      fi

      # Nested under PRD
      if [[ "$in_prd" -eq 1 ]]; then
        case "$key" in
          path|execution)
            prd="$(jq -c --arg k "$key" --argjson v "$(_yaml_parse_scalar "$val")" '.[$k]=$v' <<<"$prd")"
            ;;
          order)
            prd="$(jq -c --argjson v "$(_yaml_parse_scalar "$val")" '.order=$v' <<<"$prd")"
            ;;
          completed)
            prd="$(jq -c --argjson v "$(_yaml_parse_scalar "$val")" '.completed=$v' <<<"$prd")"
            ;;
        esac
        continue
      fi

      if [[ "$current" == "null" ]]; then
        # Orphan key — ignore or error
        continue
      fi

      case "$key" in
        blocks|blocked_by|related_to|prds)
          if [[ "$val" == "[]" ]]; then
            _set_field "$key" '[]'
            pending_array=""
            in_prd=0
          elif [[ -z "$val" ]]; then
            if [[ "$key" == "prds" ]]; then
              _set_field prds '[]'
              pending_array=""
            else
              _set_field "$key" '[]'
              pending_array="$key"
            fi
          else
            _set_field "$key" "$(_yaml_parse_scalar "$val")"
            pending_array=""
          fi
          ;;
        id|name|short_description|status|archived_at|timestamp|action|feature_id|details)
          _set_field "$key" "$(_yaml_parse_scalar "$val")"
          pending_array=""
          ;;
        sprint)
          _set_field sprint "$(_yaml_parse_scalar "$val")"
          pending_array=""
          ;;
        locked)
          _set_field locked "$(_yaml_parse_scalar "$val")"
          pending_array=""
          ;;
        path|order|execution|completed)
          # Should be under prd; if we see path here without in_prd, start prd
          if [[ "$key" == "path" ]]; then
            _flush_prd
            in_prd=1
            prd="$(jq -cn --argjson path "$(_yaml_parse_scalar "$val")" \
              '{path:$path, order:0, execution:"sequential", completed:false}')"
          fi
          pending_array=""
          ;;
        *)
          die 2 "Unsupported YAML key '${key}' in ${path} (feature registry subset only)."
          ;;
      esac
      continue
    fi
  done <"$path"

  _flush_current

  case "$kind" in
    features)
      jq -cn --argjson project "$project" --argjson sprint "$sprint" --argjson features "$features" \
        '{project:$project, sprint:$sprint, features:$features}'
      ;;
    archive)
      jq -cn --argjson project "$project" --argjson sprint "$sprint" --argjson archive "$archive" --argjson logs "$logs" \
        '{project:$project, sprint:$sprint, archive:$archive, logs:$logs}'
      ;;
  esac
}

load_features_json() {
  local j cur
  j="$(yaml_to_json "$(features_path)" features)"
  # Normalize missing feature.sprint → current file-level sprint.number
  jq -c '
    (.sprint.number // 1) as $cur |
    .features |= map(
      if (.sprint|type) == "number" then .
      else .sprint = $cur end
    )
  ' <<<"$j"
}

load_archive_json() {
  yaml_to_json "$(archive_path)" archive
}

# Load one per-sprint archive file (features/sprints/{N}.yml)
load_sprint_archive_json() {
  local n="$1"
  local path
  path="$(sprint_archive_path "$n")"
  if [[ ! -f "$path" ]]; then
    echo '{"project":{"title":"","acronym":""},"sprint":{"number":'"$n"',"start":"","end":"","closed_at":""},"archive":[],"logs":[]}'
    return
  fi
  yaml_to_json "$path" archive
}

# All archived feature objects across features/sprints/*.yml (+ legacy ARCHIVE.yml if any)
collect_archived_features_json() {
  local result='[]' f sj
  local dir
  dir="$(sprints_dir)"
  if [[ -d "$dir" ]]; then
    shopt -s nullglob
    for f in "$dir"/*.yml; do
      sj="$(yaml_to_json "$f" archive)"
      result="$(jq -nc --argjson r "$result" --argjson s "$sj" '$r + ($s.archive // [])')"
    done
    shopt -u nullglob
  fi
  # Legacy flat ARCHIVE.yml
  if [[ -f "$(archive_path)" ]]; then
    sj="$(load_archive_json)"
    result="$(jq -nc --argjson r "$result" --argjson s "$sj" '$r + ($s.archive // [])')"
  fi
  echo "$result"
}

# List sprint archive numbers present on disk (sorted numerically)
list_sprint_archive_numbers() {
  local dir f base n
  dir="$(sprints_dir)"
  [[ -d "$dir" ]] || return 0
  shopt -s nullglob
  for f in "$dir"/*.yml; do
    base="$(basename "$f" .yml)"
    if [[ "$base" =~ ^[1-9][0-9]*$ ]]; then
      printf '%s\n' "$base"
    fi
  done | sort -n
  shopt -u nullglob
}

save_features_json() {
  save_yaml_json "$(features_path)" "$1" features
}

save_archive_json() {
  save_yaml_json "$(archive_path)" "$1" archive
}

save_sprint_archive_json() {
  local n="$1" json="$2"
  # Ensure closed_at key exists on sprint archive files
  json="$(jq -c '.sprint.closed_at = (.sprint.closed_at // "")' <<<"$json")"
  save_yaml_json "$(sprint_archive_path "$n")" "$json" archive
}

# Seed or load sprint archive file with project meta from FEATURES when creating new.
ensure_sprint_archive_json() {
  local n="$1"
  local ff="${2:-}"
  local path sf
  path="$(sprint_archive_path "$n")"
  if [[ -f "$path" ]]; then
    load_sprint_archive_json "$n"
    return
  fi
  if [[ -z "$ff" ]]; then
    ff="$(load_features_json)"
  fi
  jq -cn --argjson ff "$ff" --argjson n "$n" '
    {
      project: ($ff.project // {title:"", acronym:""}),
      sprint: {
        number: $n,
        start: (if ($ff.sprint.number // 0) == $n then ($ff.sprint.start // "") else "" end),
        end: (if ($ff.sprint.number // 0) == $n then ($ff.sprint.end // "") else "" end),
        closed_at: ""
      },
      archive: [],
      logs: []
    }
  '
}
