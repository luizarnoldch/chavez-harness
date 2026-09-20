#!/usr/bin/env bash
# Feature registry operations (ported from _ops.rb).
# shellcheck shell=bash

empty_feature_json() {
  local id="$1" name="$2" desc="$3" sprint="${4:-1}"
  jq -cn \
    --arg id "$id" \
    --arg name "$name" \
    --arg desc "$desc" \
    --argjson sprint "$sprint" \
    '{
      id:$id,
      name:$name,
      short_description:$desc,
      status:"draft",
      sprint:$sprint,
      locked:false,
      blocks:[],
      blocked_by:[],
      related_to:[],
      prds:[]
    }'
}

# Move legacy features/ARCHIVE.yml entries into features/sprints/{N}.yml once.
migrate_flat_archive_to_sprints() {
  local ap
  ap="$(archive_path)"
  [[ -f "$ap" ]] || return 0

  local af count
  af="$(yaml_to_json "$ap" archive)"
  count="$(jq '.archive // [] | length' <<<"$af")"
  [[ "$count" -gt 0 ]] || return 0

  local ff cur title acronym
  if [[ -f "$(features_path)" ]]; then
    ff="$(load_features_json)"
  else
    ff="$(jq -cn --argjson af "$af" '{project:($af.project // {title:"",acronym:""}), sprint:($af.sprint // {number:1,start:"",end:""}), features:[]}')"
  fi
  cur="$(jq -r '.sprint.number // 1' <<<"$ff")"
  title="$(jq -r '.project.title // ""' <<<"$ff")"
  acronym="$(jq -r '.project.acronym // ""' <<<"$ff")"
  if [[ -z "$title" ]]; then
    title="$(jq -r '.project.title // ""' <<<"$af")"
  fi
  if [[ -z "$acronym" ]]; then
    acronym="$(jq -r '.project.acronym // ""' <<<"$af")"
  fi

  mkdir -p "$(sprints_dir)"
  local i feat sn sf
  for ((i = 0; i < count; i++)); do
    feat="$(jq -c --argjson i "$i" '.archive[$i]' <<<"$af")"
    sn="$(jq -r --argjson cur "$cur" 'if (.sprint|type) == "number" then .sprint else $cur end' <<<"$feat")"
    feat="$(jq -c --argjson sn "$sn" '.sprint = $sn' <<<"$feat")"
    sf="$(ensure_sprint_archive_json "$sn" "$ff")"
    # Prefer dates from legacy archive sprint block when numbers match
    if jq -e --argjson sn "$sn" '(.sprint.number // 0) == $sn' <<<"$af" >/dev/null; then
      sf="$(jq -c --argjson af "$af" \
        '.sprint.start = (if (.sprint.start // "") == "" then ($af.sprint.start // "") else .sprint.start end) |
         .sprint.end = (if (.sprint.end // "") == "" then ($af.sprint.end // "") else .sprint.end end)' <<<"$sf")"
    fi
    sf="$(jq -c --argjson f "$feat" '
      if any(.archive[]?; .id == $f.id) then . else .archive += [$f] end
    ' <<<"$sf")"
    save_sprint_archive_json "$sn" "$sf"
  done

  # Empty legacy ARCHIVE.yml (keep file as marker)
  af="$(jq -c '.archive = [] | .logs = []' <<<"$af")"
  save_archive_json "$af"
  echo "Migrated ${count} archived feature(s) from ${ARCHIVE_REL} into ${SPRINTS_REL}/" >&2
  log_action "MIGRATE_ARCHIVE" "-" "Moved ${count} entries from ARCHIVE.yml to features/sprints/"
}

ensure_initialized() {
  local fp clog
  migrate_legacy_yml_extensions
  fp="$(features_path)"
  clog="$(changes_log_path)"
  [[ -f "$fp" ]] || die 1 "${FEATURES_FILE} not found under $(feature_root). Run init first."
  mkdir -p "$(sprints_dir)"
  if [[ ! -f "$clog" ]]; then
    mkdir -p "$(dirname "$clog")"
    printf '# Feature action history (append-only). Managed by feature-cli.\n' >"$clog"
  fi
  migrate_flat_archive_to_sprints
}

# Require project.acronym; print it.
require_acronym() {
  local ff acronym
  ff="$(load_features_json)"
  acronym="$(jq -r '.project.acronym // ""' <<<"$ff")"
  if ! is_acronym "$acronym"; then
    die 1 "project.acronym missing or invalid in FEATURES.yml. Run: feature-cli init --title \"...\" (or set --acronym=ABC)."
  fi
  printf '%s\n' "$acronym"
}

# Next numeric suffix for {acronym}-N across active + all sprint archives.
next_feature_number() {
  local ff="$1" archived="$2" acronym="$3"
  jq -n --argjson ff "$ff" --argjson archived "$archived" --arg a "$acronym" '
    ([($ff.features // [])[].id, ($archived // [])[].id]
      | map(select(test("^" + $a + "-[1-9][0-9]*$")))
      | map(split("-")[1] | tonumber)
      | if length == 0 then 1 else (max + 1) end)
  '
}

_apply_meta_to_json() {
  local json="$1" title="$2" acronym="$3" snum="$4" sstart="$5" send="$6"
  jq -c \
    --arg title "$title" \
    --arg acronym "$acronym" \
    --argjson number "$snum" \
    --arg start "$sstart" \
    --arg end "$send" \
    '.project = {title:$title, acronym:$acronym} | .sprint = {number:$number, start:$start, end:$end}' <<<"$json"
}

cmd_init() {
  local title="" acronym="" sprint_num="" sprint_start="" sprint_end=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      --title=*) title="${arg#--title=}" ;;
      --acronym=*) acronym="${arg#--acronym=}" ;;
      --sprint=*) sprint_num="${arg#--sprint=}" ;;
      --sprint-start=*) sprint_start="${arg#--sprint-start=}" ;;
      --sprint-end=*) sprint_end="${arg#--sprint-end=}" ;;
      *) die "Unknown init flag: ${arg}" ;;
    esac
  done

  [[ -n "$title" ]] || die "init requires --title=\"Project Title\""

  if [[ -n "$acronym" ]]; then
    acronym="$(printf '%s' "$acronym" | tr '[:lower:]' '[:upper:]')"
    is_acronym "$acronym" || die "--acronym must be exactly 3 letters A-Z. Received: ${acronym}"
  else
    acronym="$(acronym_from_title "$title")"
  fi

  if [[ -z "$sprint_num" ]]; then
    sprint_num=1
  fi
  [[ "$sprint_num" =~ ^[1-9][0-9]*$ ]] || die "--sprint must be an integer >= 1. Received: ${sprint_num}"

  if [[ -z "$sprint_start" ]]; then
    sprint_start=""
  elif ! is_iso_date "$sprint_start"; then
    die "--sprint-start must be YYYY-MM-DD. Received: ${sprint_start}"
  fi
  if [[ -z "$sprint_end" ]]; then
    sprint_end=""
  elif ! is_iso_date "$sprint_end"; then
    die "--sprint-end must be YYYY-MM-DD. Received: ${sprint_end}"
  fi
  if [[ -n "$sprint_start" && -n "$sprint_end" ]] && ! date_range_ok "$sprint_start" "$sprint_end"; then
    die "sprint end must be >= start (${sprint_start} .. ${sprint_end})"
  fi

  local assets feat_t log_t
  assets="$(skill_dir)/assets"
  feat_t="${assets}/FEATURES.yml.template"
  log_t="${assets}/changes.log.template"
  [[ -f "$feat_t" ]] || die 2 "Missing template ${feat_t}"

  migrate_legacy_yml_extensions

  local created=()
  if [[ ! -f "$(features_path)" ]]; then
    cp "$feat_t" "$(features_path)"
    created+=("$FEATURES_FILE")
  fi
  mkdir -p "$(sprints_dir)"
  if [[ ! -d "$(sprints_dir)" ]]; then
    die 2 "Could not create ${SPRINTS_REL}"
  fi
  # Ensure sprints dir exists; note in created if newly made empty marker
  if [[ ! -f "$(sprints_dir)/.keep" ]] && [[ -z "$(list_sprint_archive_numbers)" ]]; then
    # directory creation counts once
    if [[ ! " ${created[*]} " == *" ${SPRINTS_REL}/ "* ]]; then
      created+=("${SPRINTS_REL}/")
    fi
  fi
  if [[ ! -f "$(changes_log_path)" ]]; then
    mkdir -p "$(dirname "$(changes_log_path)")"
    if [[ -f "$log_t" ]]; then
      cp "$log_t" "$(changes_log_path)"
    else
      printf '# Feature action history (append-only). Managed by feature-cli.\n' >"$(changes_log_path)"
    fi
    created+=("$CHANGES_LOG_REL")
  fi

  # Migrate legacy flat archive if present
  if [[ -f "$(archive_path)" ]]; then
    # Need meta on FEATURES first for migration defaults
    local ff_pre
    ff_pre="$(load_features_json)"
    ff_pre="$(_apply_meta_to_json "$ff_pre" "$title" "$acronym" "$sprint_num" "$sprint_start" "$sprint_end")"
    save_features_json "$ff_pre"
    migrate_flat_archive_to_sprints
  fi

  local ff
  ff="$(load_features_json)"
  ff="$(_apply_meta_to_json "$ff" "$title" "$acronym" "$sprint_num" "$sprint_start" "$sprint_end")"
  save_features_json "$ff"

  local detail="title=${title}; acronym=${acronym}; sprint=${sprint_num}"
  if [[ -n "$sprint_start" || -n "$sprint_end" ]]; then
    detail="${detail}; start=${sprint_start}; end=${sprint_end}"
  fi
  if [[ ${#created[@]} -gt 0 ]]; then
    local joined
    joined="$(IFS=', '; echo "${created[*]}")"
    log_action "INIT" "-" "Initialized: ${joined}; ${detail}"
    echo "Initialized: ${joined}"
  else
    log_action "INIT" "-" "Updated project/sprint metadata; ${detail}"
    echo "Updated project/sprint metadata on existing registry."
  fi
  echo "Project: ${title} (${acronym}) | Sprint ${sprint_num}"
}

log_action() {
  local action="$1" feature_id="$2" details="$3"
  local clog line
  clog="$(changes_log_path)"
  mkdir -p "$(dirname "$clog")"
  if [[ ! -f "$clog" ]]; then
    printf '# Feature action history (append-only). Managed by feature-cli.\n' >"$clog"
  fi
  line="[$(utc_now)] ${action} (${feature_id}): ${details}"
  printf '%s\n' "$line" >>"$clog"
}

all_known_ids() {
  local ff="$1" af="$2"
  jq -r '[.features[]?.id] | .[]' <<<"$ff"
  jq -r '[.archive[]?.id] | .[]' <<<"$af"
}

cmd_list() {
  ensure_initialized
  local ff
  ff="$(load_features_json)"

  local title acronym snum sstart send
  title="$(jq -r '.project.title // ""' <<<"$ff")"
  acronym="$(jq -r '.project.acronym // ""' <<<"$ff")"
  snum="$(jq -r '.sprint.number // 1' <<<"$ff")"
  sstart="$(jq -r '.sprint.start // ""' <<<"$ff")"
  send="$(jq -r '.sprint.end // ""' <<<"$ff")"
  echo "=== PROJECT / SPRINT ==="
  echo "Project: ${title:-"(unset)"} | Acronym: ${acronym:-"(unset)"}"
  echo "Current sprint: ${snum} | ${sstart:-"?"} → ${send:-"?"}"
  echo

  local sprint_nums
  sprint_nums="$(list_sprint_archive_numbers || true)"
  echo "=== SPRINT ARCHIVES (${SPRINTS_REL}/) ==="
  if [[ -z "$sprint_nums" ]]; then
    echo "No sprint archive files yet."
  else
    local sn path sf closed count
    while IFS= read -r sn; do
      [[ -z "$sn" ]] && continue
      path="$(sprint_archive_path "$sn")"
      sf="$(load_sprint_archive_json "$sn")"
      closed="$(jq -r '.sprint.closed_at // ""' <<<"$sf")"
      count="$(jq '.archive | length' <<<"$sf")"
      if [[ -n "$closed" ]]; then
        echo "  sprint ${sn}: ${count} archived | closed_at=${closed}"
      else
        echo "  sprint ${sn}: ${count} archived | open (not closed)"
      fi
    done <<<"$sprint_nums"
  fi
  echo

  echo "=== ACTIVE FEATURES ==="
  local count
  count="$(jq '.features | length' <<<"$ff")"
  if [[ "$count" -eq 0 ]]; then
    echo "No active features found in FEATURES.yml"
  else
    local i f id name status locked desc feat_sprint
    for ((i = 0; i < count; i++)); do
      f="$(jq -c --argjson i "$i" '.features[$i]' <<<"$ff")"
      id="$(jq -r '.id' <<<"$f")"
      name="$(jq -r '.name' <<<"$f")"
      status="$(jq -r '.status' <<<"$f")"
      locked="$(jq -r '.locked' <<<"$f")"
      desc="$(jq -r '.short_description // ""' <<<"$f")"
      feat_sprint="$(jq -r '.sprint // "?"' <<<"$f")"
      echo "[${id}] ${name} | Sprint: ${feat_sprint} | Status: ${status} | Locked: ${locked}"
      [[ -n "$desc" ]] && echo "  ├─ Description: ${desc}"
      if [[ "$(jq '.blocks | length' <<<"$f")" -gt 0 ]]; then
        echo "  ├─ Blocks: $(jq -c '.blocks' <<<"$f")"
      fi
      if [[ "$(jq '.blocked_by | length' <<<"$f")" -gt 0 ]]; then
        echo "  ├─ Blocked By: $(jq -c '.blocked_by' <<<"$f")"
      fi
      if [[ "$(jq '.related_to | length' <<<"$f")" -gt 0 ]]; then
        echo "  ├─ Related To: $(jq -c '.related_to' <<<"$f")"
      fi
      if [[ "$(jq '.prds | length' <<<"$f")" -gt 0 ]]; then
        echo "  └─ PRDs & Execution Flow:"
        jq -r '.prds | sort_by(.order, .path)[] |
          "     • [Order \(.order)] [\(.execution)] completed=\(.completed // false) \(.path)"' <<<"$f"
      fi
    done
  fi

  echo
  echo "=== RECENT ACTION LOGS ==="
  local clog
  clog="$(changes_log_path)"
  if [[ ! -f "$clog" ]]; then
    echo "No logs yet."
    return 0
  fi
  local recent
  recent="$(grep -v '^[[:space:]]*#' "$clog" | grep -v '^[[:space:]]*$' | tail -n 10 || true)"
  if [[ -z "$recent" ]]; then
    echo "No logs yet."
  else
    printf '%s\n' "$recent"
  fi
}

cmd_add() {
  local name="" desc="" id="" feat_sprint=""
  local -a pos=()
  local arg
  for arg in "$@"; do
    case "$arg" in
      --id=*) id="${arg#--id=}" ;;
      --sprint=*) feat_sprint="${arg#--sprint=}" ;;
      *) pos+=("$arg") ;;
    esac
  done

  if [[ ${#pos[@]} -eq 2 ]]; then
    name="${pos[0]}"
    desc="${pos[1]}"
  elif [[ ${#pos[@]} -eq 3 && -z "$id" ]]; then
    id="${pos[0]}"
    name="${pos[1]}"
    desc="${pos[2]}"
  else
    die "Usage: add [--id=ACRONYM-N] [--sprint=N] <Name> <Description>"
  fi

  [[ -n "$name" ]] || die "Name is required"
  [[ -n "$desc" ]] || die "Description is required"
  ensure_initialized

  local acronym
  acronym="$(require_acronym)"

  local ff archived
  ff="$(load_features_json)"
  archived="$(collect_archived_features_json)"

  local cur_sprint
  cur_sprint="$(jq -r '.sprint.number // 1' <<<"$ff")"
  if [[ -z "$feat_sprint" ]]; then
    feat_sprint="$cur_sprint"
  fi
  [[ "$feat_sprint" =~ ^[1-9][0-9]*$ ]] || die "--sprint must be an integer >= 1. Received: ${feat_sprint}"

  if [[ -z "$id" ]]; then
    local next
    next="$(next_feature_number "$ff" "$archived" "$acronym")"
    id="${acronym}-${next}"
  else
    feature_id_matches_acronym "$id" "$acronym" || \
      die "Feature ID must match ${acronym}-N (N >= 1, no leading zeros). Received: ${id}"
  fi

  if jq -e --arg id "$id" '
      any((.features // [])[]; .id == $id) or any((.archived // [])[]; .id == $id)
    ' <<<"$(jq -cn --argjson features "$(jq -c '.features' <<<"$ff")" --argjson archived "$archived" '{features:$features, archived:$archived}')" >/dev/null; then
    die "Feature ID ${id} already exists (active or archive)."
  fi

  local feat
  feat="$(empty_feature_json "$id" "$name" "$desc" "$feat_sprint")"
  ff="$(jq -c --argjson f "$feat" '.features += [$f]' <<<"$ff")"
  save_features_json "$ff"
  log_action "ADD_FEATURE" "$id" "Created feature: ${name} (sprint=${feat_sprint})"
  echo "Success: Feature ${id} created in draft status (sprint ${feat_sprint})."
}

# Uniq-append string IDs into a JSON string array; prints new array.
_jq_uniq_append() {
  local arr_json="$1"
  shift
  local id
  local result="$arr_json"
  for id in "$@"; do
    [[ -z "$id" ]] && continue
    result="$(jq -c --arg id "$id" 'if index($id) then . else . + [$id] end' <<<"$result")"
  done
  echo "$result"
}

# Mirror blocks: ensure from.blocks includes to, and to.blocked_by includes from.
_mirror_block() {
  local ff="$1" from_id="$2" to_id="$3"
  ff="$(jq -c --arg from "$from_id" --arg to "$to_id" '
    def uniq_add($v): if index($v) then . else . + [$v] end;
    (.features) as $feats |
    if (any($feats[]; .id == $from) | not) or (any($feats[]; .id == $to) | not) then .
    else
      .features |= map(
        if .id == $from then .blocks = ((.blocks // []) | uniq_add($to))
        elif .id == $to then .blocked_by = ((.blocked_by // []) | uniq_add($from))
        else . end
      )
    end
  ' <<<"$ff")"
  echo "$ff"
}

cmd_update() {
  local id="" status="" locked=""
  local -a blocks=() blocked_by=() related=()
  local prd_completed_path="" prd_completed_val=""
  local feat_sprint=""

  local arg
  for arg in "$@"; do
    case "$arg" in
      --id=*) id="${arg#--id=}" ;;
      --status=*) status="${arg#--status=}" ;;
      --locked=*)
        locked="${arg#--locked=}"
        locked="$(echo "$locked" | tr '[:upper:]' '[:lower:]')"
        [[ "$locked" == "true" || "$locked" == "false" ]] || die "--locked must be true|false. Received: ${locked}"
        ;;
      --blocks=*)
        while IFS= read -r line; do blocks+=("$line"); done < <(split_csv "${arg#--blocks=}")
        ;;
      --blocked-by=*)
        while IFS= read -r line; do blocked_by+=("$line"); done < <(split_csv "${arg#--blocked-by=}")
        ;;
      --related=*)
        while IFS= read -r line; do related+=("$line"); done < <(split_csv "${arg#--related=}")
        ;;
      --sprint=*)
        feat_sprint="${arg#--sprint=}"
        ;;
      --prd-completed=*)
        local pc="${arg#--prd-completed=}"
        prd_completed_path="${pc%%:*}"
        prd_completed_val="${pc#*:}"
        if [[ "$prd_completed_path" == "$pc" || -z "$prd_completed_val" ]]; then
          die "--prd-completed requires path:true|false"
        fi
        prd_completed_val="$(echo "$prd_completed_val" | tr '[:upper:]' '[:lower:]')"
        [[ "$prd_completed_val" == "true" || "$prd_completed_val" == "false" ]] || \
          die "--prd-completed value must be true|false"
        ;;
      --complete-prd=*)
        prd_completed_path="${arg#--complete-prd=}"
        prd_completed_val="true"
        ;;
      *)
        die "Unknown update flag: ${arg}"
        ;;
    esac
  done

  [[ -n "$id" ]] || die "--id is required"
  ensure_initialized

  local ff
  ff="$(load_features_json)"
  if ! jq -e --arg id "$id" 'any(.features[]; .id == $id)' <<<"$ff" >/dev/null; then
    die "Feature ${id} not found in active features."
  fi

  local details=()

  if [[ -n "$status" ]]; then
    if [[ ! "$status" =~ ^(${ACTIVE_STATUSES})$ ]]; then
      die "Invalid status '${status}'. Expected: draft|in_progress|testing|blocked|done|deployed"
    fi
    ff="$(jq -c --arg id "$id" --arg st "$status" '
      .features |= map(if .id == $id then .status = $st else . end)
    ' <<<"$ff")"
    details+=("status=${status}")
  fi

  if [[ -n "$locked" ]]; then
    local locked_json
    locked_json="$locked"
    ff="$(jq -c --arg id "$id" --argjson lk "$locked_json" '
      .features |= map(if .id == $id then .locked = $lk else . end)
    ' <<<"$ff")"
    details+=("locked=${locked}")
  fi

  if [[ -n "$feat_sprint" ]]; then
    [[ "$feat_sprint" =~ ^[1-9][0-9]*$ ]] || die "--sprint must be an integer >= 1. Received: ${feat_sprint}"
    ff="$(jq -c --arg id "$id" --argjson sn "$feat_sprint" '
      .features |= map(if .id == $id then .sprint = $sn else . end)
    ' <<<"$ff")"
    details+=("sprint=${feat_sprint}")
  fi

  local bid
  if [[ ${#blocks[@]} -gt 0 ]]; then
    for bid in "${blocks[@]}"; do
      ff="$(jq -c --arg id "$id" --arg other "$bid" '
        def uniq_add($v): if index($v) then . else . + [$v] end;
        .features |= map(if .id == $id then .blocks = ((.blocks // []) | uniq_add($other)) else . end)
      ' <<<"$ff")"
      ff="$(_mirror_block "$ff" "$id" "$bid")"
    done
    details+=("blocks+=$(IFS=','; echo "${blocks[*]}")")
  fi

  if [[ ${#blocked_by[@]} -gt 0 ]]; then
    for bid in "${blocked_by[@]}"; do
      ff="$(jq -c --arg id "$id" --arg other "$bid" '
        def uniq_add($v): if index($v) then . else . + [$v] end;
        .features |= map(if .id == $id then .blocked_by = ((.blocked_by // []) | uniq_add($other)) else . end)
      ' <<<"$ff")"
      ff="$(_mirror_block "$ff" "$bid" "$id")"
    done
    details+=("blocked_by+=$(IFS=','; echo "${blocked_by[*]}")")
  fi

  if [[ ${#related[@]} -gt 0 ]]; then
    for bid in "${related[@]}"; do
      ff="$(jq -c --arg id "$id" --arg other "$bid" '
        def uniq_add($v): if index($v) then . else . + [$v] end;
        .features |= map(
          if .id == $id then .related_to = ((.related_to // []) | uniq_add($other))
          elif .id == $other then .related_to = ((.related_to // []) | uniq_add($id))
          else . end
        )
      ' <<<"$ff")"
    done
    details+=("related+=$(IFS=','; echo "${related[*]}")")
  fi

  if [[ -n "$prd_completed_path" ]]; then
    if ! jq -e --arg id "$id" --arg path "$prd_completed_path" '
      any(.features[]; .id == $id and any(.prds[]?; .path == $path))
    ' <<<"$ff" >/dev/null; then
      die "PRD path not linked on ${id}: ${prd_completed_path}"
    fi
    ff="$(jq -c --arg id "$id" --arg path "$prd_completed_path" --argjson done "$prd_completed_val" '
      .features |= map(
        if .id == $id then
          .prds |= map(if .path == $path then .completed = $done else . end)
        else . end
      )
    ' <<<"$ff")"
    details+=("prd_completed=${prd_completed_path}:${prd_completed_val}")
    log_action "COMPLETE_PRD" "$id" "PRD ${prd_completed_path} completed=${prd_completed_val}"
  fi

  [[ ${#details[@]} -gt 0 ]] || die "Nothing to update. Pass --status, --locked, --sprint, --blocks, --blocked-by, --related, and/or --prd-completed/--complete-prd."

  save_features_json "$ff"
  local detail_str
  detail_str="$(IFS='; '; echo "${details[*]}")"
  log_action "UPDATE_FEATURE" "$id" "Updated: ${detail_str}"
  echo "Success: Feature ${id} updated."
}

cmd_link_prd() {
  local id="${1:-}" path="${2:-}" order="${3:-}" execution="${4:-}"
  [[ -n "$id" ]] || die "Feature ID required"
  [[ -n "$path" ]] || die "PRD path required"
  [[ "$order" =~ ^[0-9]+$ ]] || die "Order must be an integer. Received: ${order}"
  execution="$(echo "$execution" | tr '[:upper:]' '[:lower:]')"
  if [[ ! "$execution" =~ ^(${VALID_EXECUTION})$ ]]; then
    die "Execution must be sequential|parallel. Received: ${execution}"
  fi
  ensure_initialized

  local ff
  ff="$(load_features_json)"
  if ! jq -e --arg id "$id" 'any(.features[]; .id == $id)' <<<"$ff" >/dev/null; then
    die "Feature ${id} not found."
  fi
  if jq -e --arg id "$id" --arg path "$path" '
    any(.features[]; .id == $id and any(.prds[]?; .path == $path))
  ' <<<"$ff" >/dev/null; then
    die "PRD path already linked on ${id}: ${path}"
  fi

  ff="$(jq -c --arg id "$id" --arg path "$path" --argjson order "$order" --arg execution "$execution" '
    .features |= map(
      if .id == $id then
        .prds = ((.prds // []) + [{path:$path, order:$order, execution:$execution, completed:false}])
      else . end
    )
  ' <<<"$ff")"
  save_features_json "$ff"
  log_action "LINK_PRD" "$id" "Linked PRD ${path} (Order: ${order}, Execution: ${execution})"
  echo "Success: Linked ${path} to ${id}."
}

cmd_archive() {
  local id="${1:-}"
  [[ -n "$id" ]] || die "Feature ID required"
  ensure_initialized

  local ff
  ff="$(load_features_json)"
  if ! jq -e --arg id "$id" 'any(.features[]; .id == $id)' <<<"$ff" >/dev/null; then
    die "Feature ${id} not found."
  fi

  local sprint_n
  sprint_n="$(jq -r --arg id "$id" '(.features[] | select(.id == $id) | .sprint // empty)' <<<"$ff")"
  [[ "$sprint_n" =~ ^[1-9][0-9]*$ ]] || die "Feature ${id} missing valid sprint number; set with update --sprint=N"

  local target
  target="$(jq -c --arg id "$id" --arg ts "$(utc_now)" --argjson sn "$sprint_n" '
    (.features[] | select(.id == $id)) | .status = "archived" | .archived_at = $ts | .sprint = $sn
  ' <<<"$ff")"
  ff="$(jq -c --arg id "$id" '.features = [.features[] | select(.id != $id)]' <<<"$ff")"
  save_features_json "$ff"

  mkdir -p "$(sprints_dir)"
  local sf
  sf="$(ensure_sprint_archive_json "$sprint_n" "$ff")"
  local ff_meta
  ff_meta="$(load_features_json)"
  if [[ "$(jq -r '.sprint.number // 0' <<<"$ff_meta")" == "$sprint_n" ]]; then
    sf="$(jq -c --argjson meta "$ff_meta" \
      '.sprint.start = (if (.sprint.start // "") == "" then ($meta.sprint.start // "") else .sprint.start end) |
       .sprint.end = (if (.sprint.end // "") == "" then ($meta.sprint.end // "") else .sprint.end end) |
       .project = $meta.project' <<<"$sf")"
  else
    sf="$(jq -c --argjson meta "$ff_meta" '.project = $meta.project' <<<"$sf")"
  fi
  sf="$(jq -c --argjson t "$target" '
    if any(.archive[]?; .id == $t.id) then . else .archive += [$t] end
  ' <<<"$sf")"
  save_sprint_archive_json "$sprint_n" "$sf"

  log_action "ARCHIVE_FEATURE" "$id" "Moved to ${SPRINTS_REL}/${sprint_n}.yml (sprint=${sprint_n})"
  echo "Success: Feature ${id} archived to ${SPRINTS_REL}/${sprint_n}.yml."
}

cmd_sprint() {
  local number="" start="" end=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      --number=*) number="${arg#--number=}" ;;
      --start=*) start="${arg#--start=}" ;;
      --end=*) end="${arg#--end=}" ;;
      --also-archive)
        echo "Warning: --also-archive is deprecated; sprint archives live under ${SPRINTS_REL}/" >&2
        ;;
      *) die "Unknown sprint flag: ${arg}" ;;
    esac
  done

  [[ -n "$number" ]] || die "sprint requires --number=N"
  [[ "$number" =~ ^[1-9][0-9]*$ ]] || die "--number must be an integer >= 1"
  [[ -n "$start" ]] || die "sprint requires --start=YYYY-MM-DD"
  [[ -n "$end" ]] || die "sprint requires --end=YYYY-MM-DD"
  is_iso_date "$start" || die "--start must be YYYY-MM-DD"
  is_iso_date "$end" || die "--end must be YYYY-MM-DD"
  date_range_ok "$start" "$end" || die "sprint end must be >= start"

  ensure_initialized
  local ff
  ff="$(load_features_json)"
  ff="$(jq -c --argjson number "$number" --arg start "$start" --arg end "$end" \
    '.sprint = {number:$number, start:$start, end:$end}' <<<"$ff")"
  save_features_json "$ff"

  log_action "SET_SPRINT" "-" "number=${number}; start=${start}; end=${end}"
  echo "Success: Current sprint set to ${number} (${start} → ${end})."
}

# Close current sprint: archive done/deployed features of that sprint, set closed_at, advance current.
cmd_close_sprint() {
  local next_start="" next_end="" next_number=""
  local arg
  for arg in "$@"; do
    case "$arg" in
      --next-start=*) next_start="${arg#--next-start=}" ;;
      --next-end=*) next_end="${arg#--next-end=}" ;;
      --next-number=*) next_number="${arg#--next-number=}" ;;
      *) die "Unknown close-sprint flag: ${arg}" ;;
    esac
  done

  [[ -n "$next_start" ]] || die "close-sprint requires --next-start=YYYY-MM-DD"
  [[ -n "$next_end" ]] || die "close-sprint requires --next-end=YYYY-MM-DD"
  is_iso_date "$next_start" || die "--next-start must be YYYY-MM-DD"
  is_iso_date "$next_end" || die "--next-end must be YYYY-MM-DD"
  date_range_ok "$next_start" "$next_end" || die "next sprint end must be >= start"

  ensure_initialized
  local ff cur start end
  ff="$(load_features_json)"
  cur="$(jq -r '.sprint.number // empty' <<<"$ff")"
  [[ "$cur" =~ ^[1-9][0-9]*$ ]] || die "Current sprint.number invalid"
  start="$(jq -r '.sprint.start // ""' <<<"$ff")"
  end="$(jq -r '.sprint.end // ""' <<<"$ff")"

  if [[ -z "$next_number" ]]; then
    next_number=$((cur + 1))
  fi
  [[ "$next_number" =~ ^[1-9][0-9]*$ ]] || die "--next-number must be an integer >= 1"
  [[ "$next_number" -gt "$cur" ]] || die "--next-number must be > current sprint (${cur})"

  mkdir -p "$(sprints_dir)"
  local sf
  sf="$(ensure_sprint_archive_json "$cur" "$ff")"
  sf="$(jq -c --argjson ff "$ff" --arg start "$start" --arg end "$end" --arg ts "$(utc_now)" --argjson n "$cur" '
    .project = $ff.project |
    .sprint.number = $n |
    .sprint.start = (if $start != "" then $start else (.sprint.start // "") end) |
    .sprint.end = (if $end != "" then $end else (.sprint.end // "") end) |
    .sprint.closed_at = $ts
  ' <<<"$sf")"

  # Move done/deployed features belonging to current sprint
  local closable_ids
  closable_ids="$(jq -r --argjson cur "$cur" '
    [.features[] | select((.sprint // 0) == $cur and (.status == "deployed" or .status == "done")) | .id] | .[]
  ' <<<"$ff")"

  local id target moved=0
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    target="$(jq -c --arg id "$id" --arg ts "$(utc_now)" --argjson sn "$cur" '
      (.features[] | select(.id == $id)) | .status = "archived" | .archived_at = $ts | .sprint = $sn
    ' <<<"$ff")"
    ff="$(jq -c --arg id "$id" '.features = [.features[] | select(.id != $id)]' <<<"$ff")"
    sf="$(jq -c --argjson t "$target" '
      if any(.archive[]?; .id == $t.id) then . else .archive += [$t] end
    ' <<<"$sf")"
    moved=$((moved + 1))
    log_action "ARCHIVE_FEATURE" "$id" "close-sprint → ${SPRINTS_REL}/${cur}.yml"
  done <<<"$closable_ids"

  save_sprint_archive_json "$cur" "$sf"

  ff="$(jq -c --argjson n "$next_number" --arg start "$next_start" --arg end "$next_end" \
    '.sprint = {number:$n, start:$start, end:$end}' <<<"$ff")"
  save_features_json "$ff"

  log_action "CLOSE_SPRINT" "-" "closed=${cur}; archived_done_or_deployed=${moved}; next=${next_number}; ${next_start}→${next_end}"
  echo "Success: Closed sprint ${cur} (archived ${moved} done/deployed feature(s)). Current sprint is now ${next_number}."
}

cmd_validate() {
  local fp
  migrate_legacy_yml_extensions
  fp="$(features_path)"
  [[ -f "$fp" ]] || die 1 "${FEATURES_FILE} not found under $(feature_root)."

  migrate_flat_archive_to_sprints

  local ff archived combined
  ff="$(load_features_json)"
  archived='[]'
  local sn sf
  while IFS= read -r sn; do
    [[ -z "$sn" ]] && continue
    sf="$(load_sprint_archive_json "$sn")"
    archived="$(jq -nc --argjson r "$archived" --argjson s "$sf" '$r + ($s.archive // [])')"
  done < <(list_sprint_archive_numbers)

  combined="$(jq -cn --argjson ff "$ff" --argjson archive "$archived" \
    '{project:$ff.project, sprint:$ff.sprint, features:$ff.features, archive:$archive}')"

  local err_file
  err_file="$(mktemp)"

  local acronym title snum sstart send
  title="$(jq -r '.project.title // ""' <<<"$ff")"
  acronym="$(jq -r '.project.acronym // ""' <<<"$ff")"
  snum="$(jq -r '.sprint.number // empty' <<<"$ff")"
  sstart="$(jq -r '.sprint.start // ""' <<<"$ff")"
  send="$(jq -r '.sprint.end // ""' <<<"$ff")"

  if [[ -z "$title" ]]; then
    echo "project.title is empty (run init --title=...)" >>"$err_file"
  fi
  if ! is_acronym "$acronym"; then
    echo "project.acronym must match ^[A-Z]{3}$ (got: '${acronym}')" >>"$err_file"
  fi
  if [[ -z "$snum" ]] || [[ ! "$snum" =~ ^[1-9][0-9]*$ ]]; then
    echo "sprint.number must be an integer >= 1" >>"$err_file"
  fi
  if [[ -n "$sstart" ]] && ! is_iso_date "$sstart"; then
    echo "sprint.start must be YYYY-MM-DD (got: '${sstart}')" >>"$err_file"
  fi
  if [[ -n "$send" ]] && ! is_iso_date "$send"; then
    echo "sprint.end must be YYYY-MM-DD (got: '${send}')" >>"$err_file"
  fi
  if [[ -n "$sstart" && -n "$send" ]] && ! date_range_ok "$sstart" "$send"; then
    echo "sprint.end must be >= sprint.start" >>"$err_file"
  fi

  # Validate per-sprint archive files
  local sn path sf sn_file closed
  while IFS= read -r sn; do
    [[ -z "$sn" ]] && continue
    path="$(sprint_archive_path "$sn")"
    sf="$(load_sprint_archive_json "$sn")"
    sn_file="$(jq -r '.sprint.number // empty' <<<"$sf")"
    if [[ "$sn_file" != "$sn" ]]; then
      echo "${SPRINTS_REL}/${sn}.yml: sprint.number (${sn_file}) must match filename" >>"$err_file"
    fi
    closed="$(jq -r '.sprint.closed_at // ""' <<<"$sf")"
    if [[ -n "$closed" ]]; then
      # basic ISO8601-ish check
      if [[ ! "$closed" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]; then
        echo "${SPRINTS_REL}/${sn}.yml: closed_at should be RFC3339 UTC (got: '${closed}')" >>"$err_file"
      fi
    fi
  done < <(list_sprint_archive_numbers)

  jq -r --arg active "$ACTIVE_STATUSES" --arg allst "$VALID_STATUSES" --arg execs "$VALID_EXECUTION" --arg acronym "$acronym" '
    def check($loc; $allow_arch):
      (if ((.id // "")|tostring) == "" then "\($loc): missing id" else empty end),
      (
        if ($acronym | test("^[A-Z]{3}$")) and ((.id // "")|tostring) != "" then
          if ((.id|tostring) | test("^" + $acronym + "-[1-9][0-9]*$") | not)
          then "\($loc): id \(.id|tostring) must match \($acronym)-N" else empty end
        else empty end
      ),
      (if ((.name // "")|tostring) == "" then "\($loc): missing name" else empty end),
      (
        if (.sprint|type) != "number" or ((.sprint|floor) != .sprint) or .sprint < 1
        then "\($loc): sprint must be an integer >= 1" else empty end
      ),
      (
        if $allow_arch then
          if ((.status|tostring) | test("^(\($allst))$") | not)
          then "\($loc): invalid status \(.status|tostring)" else empty end
        else
          if ((.status|tostring) | test("^(\($active))$") | not)
          then "\($loc): invalid status \(.status|tostring) for active feature" else empty end
        end
      ),
      (if (.locked|type) != "boolean" then "\($loc): locked must be boolean" else empty end),
      (if (.blocks != null and (.blocks|type) != "array") then "\($loc): blocks must be an array" else empty end),
      (if (.blocked_by != null and (.blocked_by|type) != "array") then "\($loc): blocked_by must be an array" else empty end),
      (if (.related_to != null and (.related_to|type) != "array") then "\($loc): related_to must be an array" else empty end),
      ((.prds // []) | to_entries[] |
        (if ((.value.path // "")|tostring) == "" then "\($loc).prds[\(.key)]: path required" else empty end),
        (if (.value.order|type) != "number" then "\($loc).prds[\(.key)]: order must be integer" else empty end),
        (if ((.value.execution|tostring) | test("^(\($execs))$") | not)
         then "\($loc).prds[\(.key)]: execution must be sequential|parallel" else empty end),
        (if (.value.completed|type) != "boolean"
         then "\($loc).prds[\(.key)]: completed must be boolean" else empty end)
      );

    (.features | to_entries[] | . as $e | $e.value | check("features[\($e.key)]"; false)),
    (.archive | to_entries[] | . as $e | $e.value | check("archive[\($e.key)]"; true)),

    ([.features[].id, .archive[].id] | group_by(.) | map(select(length>1)|.[0])[] |
      "Duplicate feature IDs: \(.)"),

    (([.features[].id, .archive[].id]) as $known |
      (.features + .archive)[] | . as $f |
      ("blocks","blocked_by","related_to") as $field |
      (($f[$field] // [])[]) as $ref |
      select(($known | index($ref)) == null) |
      "\($f.id).\($field) references unknown ID \($ref)"),

    ((.features) as $feats |
      ($feats | map({key:.id, value:.}) | from_entries) as $by |
      $feats[] | . as $f |
      (
        (($f.blocks // [])[] | select($by[.] != null) | . as $other |
          select((($by[$other].blocked_by // []) | index($f.id)) == null) |
          "Missing mirror: \($other).blocked_by should include \($f.id) (because \($f.id) blocks \($other))"),
        (($f.blocked_by // [])[] | select($by[.] != null) | . as $other |
          select((($by[$other].blocks // []) | index($f.id)) == null) |
          "Missing mirror: \($other).blocks should include \($f.id) (because \($f.id) blocked_by \($other))")
      ))
  ' <<<"$combined" >>"$err_file"

  if [[ ! -s "$err_file" ]]; then
    rm -f "$err_file"
    echo "OK: FEATURES.yml and ${SPRINTS_REL}/ validate."
    return 0
  fi

  while IFS= read -r line; do
    [[ -n "$line" ]] && echo "Error: $line" >&2
  done <"$err_file"
  rm -f "$err_file"
  exit 1
}

cmd_help_json() {
  cat <<'EOF'
[
  {
    "command": "help",
    "description": "Print human help or JSON CommandSpec. Does not require jq. Run this first if unsure.",
    "usage": "feature-cli help [--json]",
    "arguments": ["--json (optional, machine-readable schemas)"],
    "examples": ["./feature-cli help", "./feature-cli help --json"]
  },
  {
    "command": "init",
    "description": "Creates FEATURES.yml, features/sprints/, and features/changes.log; sets project title/acronym and current sprint. Migrates legacy ARCHIVE.yml if present.",
    "usage": "feature-cli [--root=<path>] init --title=\"Project Title\" [--acronym=ABC] [--sprint=N --sprint-start=YYYY-MM-DD --sprint-end=YYYY-MM-DD]",
    "arguments": [
      "--title (required)",
      "--acronym (optional, exactly 3 A-Z; else derived from title)",
      "--sprint (optional, int >= 1, default 1)",
      "--sprint-start / --sprint-end (optional YYYY-MM-DD)"
    ],
    "examples": [
      "./feature-cli init --title=\"Novetec Ecommerce\" --acronym=NOV",
      "./feature-cli init --title=\"Shop\" --acronym=SHP --sprint=1 --sprint-start=2026-08-01 --sprint-end=2026-08-14"
    ]
  },
  {
    "command": "list",
    "description": "Shows current sprint, sprint archive files under features/sprints/, active features (with feature.sprint), and recent logs.",
    "usage": "feature-cli [--root=<path>] list",
    "arguments": [],
    "examples": ["./feature-cli list"]
  },
  {
    "command": "add",
    "description": "Creates a feature with auto ID {acronym}-{next}. sprint defaults to current; override with --sprint=N.",
    "usage": "feature-cli add [--id=ABC-N] [--sprint=N] <Name> <Description>",
    "arguments": ["--id (optional)", "--sprint (optional)", "Name (string)", "Description (string)"],
    "examples": [
      "./feature-cli add 'Auth API' 'OAuth2 implementation'",
      "./feature-cli add --sprint=2 'Payments' 'Stripe checkout'"
    ]
  },
  {
    "command": "update",
    "description": "Updates status, lock, planned sprint, relations, or PRD completed flag.",
    "usage": "feature-cli update --id=<ID> [--status=<status>] [--sprint=N] [--locked=true|false] [--blocks=<id>] [--blocked-by=<id>] [--related=<id>] [--prd-completed=<path>:true|false] [--complete-prd=<path>]",
    "arguments": [
      "id (required)",
      "status (draft|in_progress|testing|blocked|done|deployed)",
      "sprint (int >= 1)",
      "locked (bool)",
      "blocks / blocked-by / related (comma-sep IDs)",
      "prd-completed (path:true|false)",
      "complete-prd (path; sets completed true)"
    ],
    "examples": [
      "./feature-cli update --id=NOV-1 --status=in_progress",
      "./feature-cli update --id=NOV-1 --status=done",
      "./feature-cli update --id=NOV-1 --sprint=2",
      "./feature-cli update --id=NOV-1 --complete-prd=features/tasks/prd-auth.md"
    ]
  },
  {
    "command": "link-prd",
    "description": "Links a PRD with order/execution; completed defaults to false.",
    "usage": "feature-cli link-prd <ID> <PRD_Path> <Order> <sequential|parallel>",
    "arguments": ["ID (string)", "PRD_Path (string)", "Order (int)", "Execution (sequential|parallel)"],
    "examples": ["./feature-cli link-prd NOV-1 'features/tasks/prd-auth-db.md' 1 sequential"]
  },
  {
    "command": "sprint",
    "description": "Updates the current sprint window on FEATURES.yml only.",
    "usage": "feature-cli sprint --number=N --start=YYYY-MM-DD --end=YYYY-MM-DD",
    "arguments": ["--number", "--start", "--end"],
    "examples": ["./feature-cli sprint --number=2 --start=2026-08-15 --end=2026-08-28"]
  },
  {
    "command": "close-sprint",
    "description": "Closes current sprint: writes closed_at to features/sprints/{N}.yml, archives done/deployed features of that sprint, advances current sprint.",
    "usage": "feature-cli close-sprint --next-start=YYYY-MM-DD --next-end=YYYY-MM-DD [--next-number=N]",
    "arguments": ["--next-start", "--next-end", "--next-number (optional, default current+1)"],
    "examples": ["./feature-cli close-sprint --next-start=2026-08-15 --next-end=2026-08-28"]
  },
  {
    "command": "archive",
    "description": "Moves an active feature into features/sprints/{feature.sprint}.yml.",
    "usage": "feature-cli archive <ID>",
    "arguments": ["ID (string)"],
    "examples": ["./feature-cli archive NOV-1"]
  },
  {
    "command": "validate",
    "description": "Validates project/sprint, feature.sprint, IDs, relations, PRDs, and features/sprints/*.yml.",
    "usage": "validate.sh [--root=<path>]",
    "arguments": [],
    "examples": ["./validate.sh --root=."]
  }
]
EOF
}

cmd_help_text() {
  cat <<'HELP'
==========================================================================
                FEATURE MANAGEMENT CLI - HELP & MANUAL
==========================================================================
Manages FEATURES.yml (current sprint + features with planned sprint),
per-sprint archives under features/sprints/{N}.yml, and features/changes.log.

Usage: feature-cli.sh [--root <project>] <command> [args...]

LLM / agent quick start (in order):
  1. feature-cli.sh help --json
  2. feature-cli.sh --root <p> init --title "Project Title"
  3. feature-cli.sh --root <p> list
  4. mutate: add | update | link-prd | sprint | close-sprint | archive
  5. validate.sh --root <p>

Commands:
  init --title="..." [--acronym=ABC] [--sprint=N --sprint-start=... --sprint-end=...]
  list                         Show current sprint, sprints/ archives, features
  add [--id=] [--sprint=N] <Name> <Desc>   Default sprint = current
  update --id=<ID> [flags]     Status/lock/sprint/relations/PRD completed
  link-prd <ID> <path> <ord> <sequential|parallel>
  sprint --number=N --start=YYYY-MM-DD --end=YYYY-MM-DD
  close-sprint --next-start=... --next-end=... [--next-number=N]
  archive <ID>                 → features/sprints/{feature.sprint}.yml
  help [--json]

Update flags:
  --status=draft|in_progress|testing|blocked|done|deployed
  --sprint=N
  --locked=true|false
  --blocks=<id,id>  --blocked-by=<id,id>  --related=<id,id>
  --prd-completed=<path>:true|false   --complete-prd=<path>

Paths: FEATURES.yml | features/sprints/{N}.yml | features/changes.log
IDs: {acronym}-N. Logs: SET_SPRINT, CLOSE_SPRINT, COMPLETE_PRD, …
STATUS: draft -> in_progress -> testing -> blocked -> done -> deployed -> archived
Validate: bash scripts/validate.sh --root <project>
jq: auto-vendored on first non-help command if missing
==========================================================================
HELP
}

