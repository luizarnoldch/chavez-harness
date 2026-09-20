# Template catalog

Each `kind`+`type` maps to one file under `assets/templates/`. The CLI copies that file and replaces `{{PLACEHOLDERS}}`.

## Kinds

### prd

Full product/slice spec. Agent fills human sections after `create`. Do not rewrite `## Execution`.

Required sections after fill: Overview, Problem Statement, Goals, Non-Goals, User Stories, Acceptance Criteria, Technical Context, Execution, Out of Scope.

Type-specific extra:

- `backend-scaffold` → Data Model (entity field table)
- `frontend-scaffold` → UI/UX (routes + component tree)
- `nextjs-init` → Setup Guide (ordered create-next-app → shadcn → tRPC → env-config)
- `nextjs-db-setup` → Setup Guide (ordered docker-compose Postgres → env-config → drizzle)
- `nextjs-better-auth-setup` → Setup Guide (prereqs Drizzle + config → better-auth CLI validate)
- `nextjs-better-auth-frontend` → Setup Guide (prereq foundation PASS + tRPC → frontend CLI validate)
- `nextjs-cypress-setup` → Setup Guide (prereqs auth frontend + db scripts → Cypress harness CLI validate)
- `nextjs-cypress-e2e` → Setup Guide (prereq harness PASS + frontend scaffold → entity e2e CLI validate)

### ticket

Short execution unit. Human sections stay small; Execution is the payload.

Required sections: Summary, Goal, Acceptance criteria (checklist), Execution, Notes.

## Types

### backend-scaffold

- Skill: `nextjs-backend-scaffolding`
- Allowed kinds: `prd`, `ticket`
- Required params: `entity`, `layers`, `transport`, `database`, `target`
- `layers`: `schema` | `server` | `hooks` | `all` (default `all`)
- `transport`: `trpc` | `api` (default `trpc`)
- `database`: `prisma` | `drizzle` (default `prisma`)

### frontend-scaffold

- Skill: `nextjs-frontend-scaffolding`
- Allowed kinds: `prd`, `ticket`
- Required params: `entity`, `flag`, `transport`, `target`
- `flag`: `--all` | `--page list` | `--view` | `--view-full` (default `--all`)
- `transport`: `trpc` | `api` (default `trpc`)

### backend-review

- Skill: `nextjs-backend-scaffolding-reviewer`
- Allowed kinds: `ticket` only
- Required params: `entity`, `transport`, `database`, `target`

### frontend-review

- Skill: `nextjs-frontend-scaffolding-reviewer`
- Allowed kinds: `ticket` only
- Required params: `entity`, `transport`, `target`

### nextjs-init

- Skill: `nextjs-trpc-setup` (step 3 only in `## Execution`; steps 1–2 and 4 are guide-only in the PRD Setup Guide)
- Guide-only after tRPC: `nextjs-env-config` (step 4 — bootstrap `config.ts`, `.env.example`, append-only `.env`, wire `client.tsx`)
- Allowed kinds: `prd` only
- Required params: none (empty `params` block)
- `--entity` optional on create (default `App`); frontmatter still includes `entity`
- Body must document ordered bootstrap: create-next-app → shadcn + `TooltipProvider` → tRPC CLI (validate PASS) → `nextjs-env-config` bootstrap (do **not** re-validate tRPC)

### nextjs-db-setup

- Skill: `nextjs-drizzle-setup` (step 3 only in `## Execution`; steps 1–2 are guide-only in the PRD Setup Guide)
- Guide-only before drizzle: `docker-compose` (step 1 — stack Postgres + `up -d`) and `nextjs-env-config` (step 2 — `DATABASE_URL` / `config.databaseUrl`, append-only)
- Allowed kinds: `prd` only
- Required params: none (empty `params` block)
- Create flags required: `--project=<prefix>`, `--postgres-port=<port>` (filled into Setup Guide placeholders)
- `--entity` optional on create (default `App`); frontmatter still includes `entity`
- Body must document ordered bootstrap: pre-seed env → `docker-compose` stack/up → `nextjs-env-config` `add-env-var` → `nextjs-drizzle-setup` CLI (validate PASS)

### nextjs-better-auth-setup

- Skill: `nextjs-better-auth-setup` (single step in `## Execution`; env keys synced inside the skill via `nextjs-env-config` `add-env-var`)
- Allowed kinds: `prd` only
- Required params: none (empty `params` block)
- `--entity` optional on create (default `App`); frontmatter still includes `entity`
- Body must document: prereqs (`nextjs-drizzle-setup` + `config.nextPublicAppUrl`) → CLI `main.sh` + `validate.sh` PASS → manual `BETTER_AUTH_SECRET` / drizzle migrate notes
- Non-goals: sign-in UI, `proxy.ts`, `protectedProcedure` (those belong to `nextjs-better-auth-frontend`)

### nextjs-better-auth-frontend

- Skill: `nextjs-better-auth-frontend` (single step in `## Execution`)
- Allowed kinds: `prd` only
- Required params: none (empty `params` block)
- `--entity` optional on create (default `App`); frontmatter still includes `entity`
- Body must document: prereqs (`nextjs-better-auth-setup` validate PASS + `src/app/api/trpc/[trpc]/route.ts`) → CLI `main.sh` + `validate.sh` PASS
- Non-goals: OAuth UI, adding `BETTER_AUTH_*`, re-running `nextjs-trpc-setup` validate after patches

### nextjs-cypress-setup

- Skill: `nextjs-cypress-setup` (single step in `## Execution`)
- Allowed kinds: `prd` only
- Required params: none (empty `params` block)
- `--entity` optional on create (default `App`); frontmatter still includes `entity`
- Body must document: prereqs (drizzle db scripts + better-auth foundation + auth frontend) → CLI `main.sh` + `validate.sh` PASS
- Non-goals: entity CRUD specs (those belong to `nextjs-cypress-e2e`)

### nextjs-cypress-e2e

- Skill: `nextjs-cypress-e2e` (single step in `## Execution`)
- Allowed kinds: `prd` only
- Required params: `entity`, `target`
- `--entity` required on create
- Body must document: prereqs (`nextjs-cypress-setup` validate PASS + frontend List/FormCreate/FormUpdate) → CLI `main.sh --entity` + `validate.sh` PASS
- Non-goals: harness install, inventing selectors outside `data-cy-*` / `sel.[entity]s`

## Placeholders

| Token | Meaning |
|-------|---------|
| `{{KIND}}` | `prd` or `ticket` |
| `{{TYPE}}` | type slug |
| `{{ID}}` | `{kind}-{slug}-v1` |
| `{{TITLE}}` | Human title |
| `{{ENTITY}}` | PascalCase entity |
| `{{entity}}` | camelCase entity |
| `{{entity_kebab}}` | kebab-case entity |
| `{{DATE}}` | `YYYY-MM-DD` (UTC) |
| `{{FEATURE_ID_LINE}}` | `feature_id: ID` plus newline, or empty |
| `{{TARGET}}` | Absolute Next.js app path |
| `{{SKILL_NAME}}` | Cursor skill name |
| `{{LAYERS}}` | backend layers |
| `{{TRANSPORT}}` | `trpc` or `api` |
| `{{DATABASE}}` | `prisma` or `drizzle` |
| `{{FLAG}}` | frontend CLI flag |
| `{{PROJECT}}` | docker-compose `--project` prefix (`nextjs-db-setup`) |
| `{{POSTGRES_PORT}}` | Postgres host port (`nextjs-db-setup`) |

## Output paths

- PRD: `features/tasks/prd-<slug>/prd.md`
- Ticket: `features/tasks/ticket-<slug>/ticket.md`

`--name` is the slug (`^[a-z0-9]+(-[a-z0-9]+)*$`). Strip a leading `prd-` / `ticket-` if the user included it.
