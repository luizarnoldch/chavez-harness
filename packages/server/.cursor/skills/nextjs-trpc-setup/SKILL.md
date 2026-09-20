---
name: nextjs-trpc-setup
description: >-
  Use when bootstrapping or restoring the project's tRPC foundation in a Next.js
  App Router app — adding src/trpc/, src/app/api/trpc/[trpc]/route.ts,
  TRPCReactProvider in layout, or when the user says set up tRPC, install tRPC
  client/server, wire TanStack Query provider, or scaffold the hello router.
  Also use when an agent is about to rewrite tRPC from memory or put the route
  under app/trpc instead of app/api/trpc.
---

# Next.js tRPC foundation setup

CLI + `assets/` are the **only** source of truth. Do not invent tRPC files from general knowledge.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN src/trpc/* OR ROUTE HANDLER — RUN THE CLI
```

Write files from memory? Delete them. Run `scripts/main.sh`. Start over.

**No exceptions:**
- Do not "adapt" official tRPC docs over assets
- Do not put the handler at `src/app/trpc/` — canonical is `src/app/api/trpc/`
- Do not rewrite `layout.tsx` wholesale — only `patch-layout.sh`
- Do not hand-run a different `bun add` set — use `install-deps.sh` / `main.sh`
- Do not add `protectedProcedure` or feature routers here — those belong to later skills (e.g. **nextjs-better-auth-frontend**)

## Path resolution

Scripts live in this skill folder. Never invoke a bare `scripts/main.sh`.

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-trpc-setup/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-trpc-setup`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-trpc-setup"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT"
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

Flags: `--force` (overwrite files), `--force-install` (full bun add), `--skip-deps`, `--files-only`, `--layout-only`.

Order: **deps → files → layout → validate**.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT (absolute)
- [ ] 2. bash scripts/main.sh --root "$ROOT" [--force / --force-install as needed]
- [ ] 3. bash scripts/validate.sh --root "$ROOT" (must PASS — includes deps)
- [ ] 4. If install-deps fails: fix bun/network, re-run — do not invent a different package list
```

## What gets installed

See `reference/file-map.md`, `reference/layout-integration.md`, `reference/deps.md`.

Canonical tree:

```
src/trpc/
  client.tsx
  init.ts
  server.tsx
  query-client.ts
  routers/_app.ts
src/app/api/trpc/[trpc]/route.ts
src/app/layout.tsx   # import + <TRPCReactProvider>{children}</TRPCReactProvider>
```

Endpoint string and filesystem path both use `/api/trpc`.

**After validate PASS:** run **nextjs-env-config** `bootstrap.sh` to wire `getUrl()` to `config.nextPublicAppUrl`. Do **not** re-run this skill's `validate.sh` after that wire — byte-cmp against pre-wire `client.tsx` will fail by design.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know modern tRPC; faster to write from scratch" | Assets encode this project's exact stack. Improvising drops superjson/RSC pieces. |
| "app/trpc is fine; skip api/" | **Forbidden.** Canonical capture is `src/app/api/trpc/[trpc]/route.ts`. |
| "Demo in 20 minutes — skip the CLI" | CLI is faster and deterministic. Run `main.sh`. |
| "I'll rewrite layout cleanly with the provider" | Use `patch-layout.sh` only. Full rewrites destroy fonts/metadata. |
| "Docs omit createTRPCOptionsProxy — simplify server.tsx" | Keep the asset. Demo convenience ≠ canonical foundation. |
| "I'll run the CLI, then move the handler after validate" | Post-CLI edits invalidate the capture. Re-run `validate.sh` after any touch. |
| "I'll add packages myself later / different versions" | `install-deps.sh` is the source of truth. validate fails if any of the 9 are missing. |
| "I'll add protectedProcedure while I'm here" | Out of scope. Foundation stays stub `init` + `hello` only. |

## Red flags — STOP

- Creating `src/app/trpc/[trpc]/route.ts` instead of `src/app/api/trpc/`
- Editing endpoint strings or `getUrl()` by hand (including after a green validate)
- Pasting tRPC boilerplate from memory into `src/trpc/`
- Skipping `validate.sh`
- Claiming "spirit of working tRPC" while changing paths
- `--files-only` then hand-patching layout instead of `patch-layout.sh`
- `--skip-deps` then forgetting to install, or using a non-canonical package list

**All of these mean: delete hand-written changes, run `main.sh`, re-validate.**

## Related skills

- **nextjs-env-config** — run after this skill's validate PASS; wires client to `config`
- Feature routers/hooks: **nextjs-backend-scaffolding** / **nextjs-frontend-scaffolding**
- Auth UI + `protectedProcedure`: **nextjs-better-auth-frontend** (after better-auth foundation)
