# Stacking rules

`scripts/stack.sh` merges fragments into `$ROOT/docker-compose.yml`.

## Create vs merge

| State | Behavior |
|-------|----------|
| No `docker-compose.yml` | Write `services:` from `assets/compose/header.yml`, then stack requested fragments |
| File exists | Keep all existing keys; only insert **missing** service/volume keys |
| Unknown top-level content | Preserved; stack never deletes foreign services |

## Service insertion

1. Extract compose key from the fragment (first `  name:` line).
2. If `  name:` already exists in the file → skip + log.
3. Else insert the rendered block under `services:` immediately **before** a top-level `volumes:` section if present; otherwise append under `services:`.

## Volume insertion

1. Extract volume key from `assets/compose/volumes/<id>.yml`.
2. If missing and no `volumes:` section → append `volumes:` then the entry.
3. If `volumes:` exists and key missing → append the entry under it.
4. If key exists → skip.

## Project substitution

Every `{{PROJECT}}` in service fragments is replaced with `--project` before insert.
Volume fragments do not use `{{PROJECT}}`.

## Env sync

After compose updates, `sync-env.sh` runs per requested service:

- Read `assets/env/<id>.env`
- For each `KEY=value`: if KEY absent in `.env.example` / `.env`, append with `>>`
- Never rewrite existing values

## Idempotency

Re-running the same `stack.sh` command must:

- Leave existing services/volumes untouched
- Skip env keys that already exist
- Exit successfully
