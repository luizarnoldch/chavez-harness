---
name: docker-compose
description: >-
  Scaffolds and stacks Docker Compose services from fragment templates (Postgres,
  MinIO, extensible). Composes docker-compose.yml, syncs service env keys
  append-only into .env.example and .env. Use when adding docker-compose,
  local Postgres, MinIO, Docker services, compose stack, or containerized
  infrastructure.
---

# Docker Compose

CLI + `assets/` are the source of truth for `docker-compose.yml` fragments and
append-only env sync. Never invent compose services from memory — stack via scripts.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
COMPOSE SERVICES COME FROM assets/ FRAGMENTS + stack.sh — NEVER HAND-WRITE STACKS
```

**No exceptions:**
- Do not paste full compose files from memory when a fragment exists
- Do not rewrite existing keys in `.env` / `.env.example` (append-only `>>`)
- Do not duplicate a service or volume already present in `docker-compose.yml`
- Do not hardcode container prefixes — always pass `--project`

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/stack.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/docker-compose/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/docker-compose`
3. `--root` is the **absolute** project root where `docker-compose.yml` and `.env*` are written.
4. `--project` is the container name prefix (e.g. `novetec` → `novetec-db`).

## When to use

| Situation | Command |
|-----------|---------|
| First local stack (Postgres + MinIO) | `stack.sh --root "$ROOT" --project NAME --services postgres,minio` |
| Add one more catalog service | `stack.sh --root "$ROOT" --project NAME --services redis` (once asset exists) |
| List available fragments | `list-services.sh` |
| Sync env keys for one service only | `sync-env.sh --root "$ROOT" --service postgres` |

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/docker-compose"
ROOT="<absolute-project-root>"

bash "$SKILL/scripts/stack.sh" --root "$ROOT" --project novetec --services postgres,minio
```

What stack does (in order):

1. Validate each service id against `assets/compose/<id>.yml` (+ optional volume + env)
2. Create or **stack-merge** into `$ROOT/docker-compose.yml` (skip existing service/volume keys)
3. Substitute `{{PROJECT}}` in fragments
4. Append-only sync of `assets/env/<id>.env` into `.env.example` and `.env`

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute)
- [ ] 2. Choose --project prefix (required)
- [ ] 3. Pick services: list-services.sh
- [ ] 4. stack.sh --root … --project … --services …
- [ ] 5. Confirm docker-compose.yml + .env.example keys; no rewrites of existing .env values
```

## Canonical outputs

```
docker-compose.yml   # stacked services + volumes
.env.example         # committed documentation of keys
.env                 # local only; append new keys; never rewrite
```

## Adding a new service

1. `assets/compose/<id>.yml` — indented service block (`  <compose_key>:`)
2. `assets/compose/volumes/<id>.yml` — optional top-level volume entry
3. `assets/env/<id>.env` — `KEY=default` lines for append-only sync
4. Document in [reference/services.md](reference/services.md)

Discovery is filesystem-based: any `assets/compose/*.yml` except `header.yml` is a service id.

## Additional resources

- Service catalog and env keys: [reference/services.md](reference/services.md)
- Merge / stack rules: [reference/stacking.md](reference/stacking.md)

## Anti-patterns

| Thought | Reality |
|---------|---------|
| "I'll just copy a compose snippet from ChatGPT" | Forbidden. Use `stack.sh` + assets. |
| "I need to update an old .env value" | Out of scope. Append-only for **new** keys only. |
| "Re-run stack to refresh the db service" | Stack skips existing keys; edit compose manually only if intentional. |
| "Hardcode novetec-db" | Always `--project`; templates use `{{PROJECT}}`. |
