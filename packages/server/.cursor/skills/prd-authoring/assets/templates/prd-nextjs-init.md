---
kind: {{KIND}}
type: {{TYPE}}
id: {{ID}}
status: draft
created: {{DATE}}
entity: {{ENTITY}}
{{FEATURE_ID_LINE}}---

# PRD: {{TITLE}}

## Overview

Bootstrap a Next.js App Router project at `{{TARGET}}` with TypeScript, Tailwind, Biome, Bun, shadcn/ui (including `TooltipProvider`), the shared tRPC foundation via `nextjs-trpc-setup`, and typed env config via `nextjs-env-config`.

## Problem Statement

Feature scaffolding (backend/frontend) assumes a consistent Next.js + shadcn + tRPC baseline. Without a documented, ordered init, agents invent layouts, paths, or tRPC wiring that break later scaffolds. Env access must also go through a single Zod `config.ts` after tRPC is validated — not ad-hoc `process.env`.

## Goals

- [ ] Create the Next.js app with the canonical Bun create flags (`--ts`, `--tailwindcss`, `--biome`, `--app`, `--src-dir`, `--use-bun`)
- [ ] Initialize shadcn/ui and wrap the root layout with `TooltipProvider`
- [ ] Install and validate the tRPC foundation using only `nextjs-trpc-setup` (CLI + validate)
- [ ] Bootstrap `src/lib/config.ts`, `.env.example`, append-only `.env` sync, and wire `src/trpc/client.tsx` via `nextjs-env-config` (after tRPC validate PASS)

## Non-Goals

- Scaffolding feature entities (routers, hooks, pages) — use backend/frontend scaffold PRDs after init
- Creating new Cursor skills for create-next-app or shadcn
- Changing canonical tRPC paths or package lists from `nextjs-trpc-setup` assets
- Putting `nextjs-env-config` in `## Execution` (Step 4 is guide-only; Execution stays tRPC-only)

## User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | developer / agent | bootstrap the app with fixed create-next-app flags | the repo matches harness conventions |
| US-02 | developer / agent | install shadcn and wire `TooltipProvider` | UI primitives and tooltips work from day one |
| US-03 | developer / agent | run `nextjs-trpc-setup` after UI baseline | tRPC + TanStack Query providers are installed without hand-written boilerplate |
| US-04 | developer / agent | run `nextjs-env-config` after tRPC validate | env is typed in `config.ts`, documented in `.env.example`, and the tRPC client uses `config.nextPublicAppUrl` |

## Acceptance Criteria

| ID | Story | Criterion |
|---|---|---|
| AC-01 | US-01 | When step 1 completes, `package.json` exists under `{{TARGET}}` and `src/app/` is present (`--src-dir`) |
| AC-02 | US-02 | When step 2 completes, shadcn components live under `src/components/ui/` and `src/app/layout.tsx` wraps children with `TooltipProvider` |
| AC-03 | US-03 | When step 3 completes, `bash nextjs-trpc-setup/scripts/validate.sh --root {{TARGET}}` exits PASS; layout still includes `TooltipProvider` (tRPC provider added via `patch-layout.sh` only) |
| AC-04 | US-04 | When step 4 completes, `src/lib/config.ts` exists, `.env.example` documents base keys, new keys were append-only synced to `.env`, and `src/trpc/client.tsx` uses `config.nextPublicAppUrl` — and `nextjs-trpc-setup` validate is **not** re-run |

## Setup Guide

Execute **in order**. Do not skip ahead. Steps 1–2 and 4 are guide-only; step 3 is the only automated skill in `## Execution`.

### Step 1 — Create Next.js project

From `{{TARGET}}` (project root):

```bash
bun create next-app@latest . --ts --tailwindcss --biome --app --src-dir --use-bun
```

### Step 2 — shadcn/ui + TooltipProvider

```bash
bunx --bun shadcn@latest init
bunx --bun shadcn@latest add -ayo
```

Ensure `src/app/layout.tsx` wraps the body content with `TooltipProvider` (paths use `src/` because of `--src-dir`):

```tsx
import { TooltipProvider } from "@/components/ui/tooltip"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
```

Preserve any fonts/metadata already emitted by create-next-app; only add the import and provider wrap.

### Step 3 — tRPC foundation (`nextjs-trpc-setup`)

Load the `nextjs-trpc-setup` skill. Do **not** hand-write `src/trpc/*` or the route handler. Run:

```bash
SKILL="<repo>/.cursor/skills/nextjs-trpc-setup"
bash "$SKILL/scripts/main.sh" --root "{{TARGET}}"
bash "$SKILL/scripts/validate.sh" --root "{{TARGET}}"
```

Use `patch-layout.sh` only for layout integration so `TRPCReactProvider` nests without removing `TooltipProvider`. Re-run validate until PASS.

Do **not** start Step 4 until validate exits PASS. Leave `nextjs-trpc-setup` assets unchanged.

### Step 4 — Env config (`nextjs-env-config`)

Load the `nextjs-env-config` skill. Run **after** Step 3 validate PASS:

```bash
SKILL="<repo>/.cursor/skills/nextjs-env-config"
bash "$SKILL/scripts/bootstrap.sh" --root "{{TARGET}}"
```

This installs `src/lib/config.ts`, ensures `.gitignore` has `.env*` + `!*.example`, append-only syncs base keys into `.env.example` and `.env`, and wires `src/trpc/client.tsx` `getUrl()` to `config.nextPublicAppUrl`.

**Do not** re-run `nextjs-trpc-setup/scripts/validate.sh` after this step — the client intentionally diverges from tRPC assets.

Later env vars: use `add-env-var.sh` / `sync-env-key.sh` from the same skill (append-only; never rewrite existing `.env` values).

## Technical Context

- **Entity**: `{{ENTITY}}` (setup sentinel; not a domain model)
- **Target**: `{{TARGET}}`
- **Stack**: Next.js App Router, TypeScript, Tailwind, Biome, Bun, shadcn/ui, tRPC, Zod config
- **Src layout**: `src/app/`, `src/components/ui/`, `src/trpc/` after step 3; `src/lib/config.ts` after step 4
- **Automated skill (Execution)**: `{{SKILL_NAME}}` (step 3 only)
- **Guide-only skill**: `nextjs-env-config` (step 4 only)

## Execution

```yaml
kind: {{KIND}}
type: {{TYPE}}
target: {{TARGET}}
skills:
  - name: {{SKILL_NAME}}
    params:
```

## Out of Scope

- Feature CRUD scaffolds and review tickets
- Database / Prisma / Drizzle setup
- Auth, deployment, or CI configuration
- Changing `nextjs-trpc-setup` assets to depend on `config.ts`

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | None for canonical init | — | closed |
