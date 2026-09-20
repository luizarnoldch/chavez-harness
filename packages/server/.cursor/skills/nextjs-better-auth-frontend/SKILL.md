---
name: nextjs-better-auth-frontend
description: >-
  Installs better-auth email/password UI and tRPC wiring after nextjs-better-auth-setup
  — features/auth (forms, hooks, router/service/repository), (auth) sign-in/sign-up
  pages, dashboard stub, src/proxy.ts session guards, protectedProcedure, and
  authRouter mount. Use when the user says frontend better-auth, sign-in/sign-up UI,
  auth feature, proxy auth guards, protectedProcedure auth, or after better-auth
  foundation validate PASS.
---

# Next.js better-auth frontend setup

CLI + `assets/` are the **only** source of truth. Do not invent auth forms or
`protectedProcedure` from better-auth React client docs.

**Violating the letter of the rules is violating the spirit of the rules.**

## Iron law

```
NO HAND-WRITTEN AUTH UI / PROXY / protectedProcedure — RUN THE CLI
```

Write from memory? Delete it. Run `scripts/main.sh`. Start over.

**No exceptions:**
- Do not wire forms to `authClient` / `better-auth/react` — UI uses **tRPC → `auth.api`**
- Do not invent OAuth / social UI
- Do not re-run **nextjs-trpc-setup** validate after patches (init/_app diverge by design)
- Do not add `BETTER_AUTH_*` here — that is **nextjs-better-auth-setup** → **nextjs-env-config**

## Path resolution

1. Repo root: `git rev-parse --show-toplevel`. If that fails, walk upward until `.cursor/skills/nextjs-better-auth-frontend/SKILL.md` exists.
2. Skill dir: `<repo-root>/.cursor/skills/nextjs-better-auth-frontend`
3. `--root` is the **absolute** Next.js project root (directory containing `src/`).

## Prerequisites

1. **nextjs-trpc-setup** — route at `src/app/api/trpc/[trpc]/route.ts`
2. **nextjs-better-auth-setup** validate PASS (`src/lib/auth`, `api/auth`, schema, `config.betterAuth*`)
3. Prefer shadcn form primitives already present (Card/Field/Button) for the captured forms

## Quick start

```bash
SKILL="<repo-root>/.cursor/skills/nextjs-better-auth-frontend"
ROOT="<absolute-target-project-root>"

bash "$SKILL/scripts/main.sh" --root "$ROOT"
bash "$SKILL/scripts/validate.sh" --root "$ROOT"
```

Flags: `--force` (overwrite files / replace `init.ts` from asset).

Order: **files → patch-init → patch-app-router → validate**.

## Workflow checklist

```
Progress:
- [ ] 1. Resolve SKILL + ROOT; confirm better-auth foundation + api/trpc + config.betterAuth*
- [ ] 2. bash scripts/main.sh --root "$ROOT" [--force]
- [ ] 3. bash scripts/validate.sh --root "$ROOT" (must PASS)
- [ ] 4. Do NOT re-run nextjs-trpc-setup validate
```

## What gets installed

See `reference/file-map.md`.

Canonical tree:

```
src/features/auth/
  components/AuthSignInForm.tsx, AuthSignUpForm.tsx
  hooks/useSignIn.tsx, useSignUp.tsx, useSignOut.tsx
  schemas/auth.schema.ts
  server/auth.{router,service,repository}.ts
  views/SignInView.tsx, SignUpView.tsx
src/app/(auth)/layout.tsx
src/app/(auth)/sign-in/page.tsx
src/app/(auth)/sign-up/page.tsx
src/app/dashboard/page.tsx
src/proxy.ts
src/trpc/init.ts              # patched: protectedProcedure
src/trpc/routers/_app.ts      # patched: auth: authRouter
```

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "Use authClient.signIn in the form — it's the official way" | **Forbidden.** Capture uses tRPC mutations → `auth.api`. |
| "I'll write protectedProcedure myself — it's 10 lines" | Run `patch-init.sh`. Foundation stub must be replaced from asset. |
| "middleware.ts instead of proxy.ts" | Canonical Next capture is `src/proxy.ts`. |
| "Skip validate — pages look fine" | validate is mandatory. |

## Red flags — STOP

- Hand-writing `features/auth` or `proxy.ts`
- Importing `auth-client` in auth forms
- Skipping `validate.sh`
- Re-running tRPC foundation validate and "fixing" init back to stub

**All of these mean: delete hand-written changes, run `main.sh`, re-validate.**

## Related skills

- **nextjs-better-auth-setup** — must PASS before this skill
- **nextjs-trpc-setup** — foundation only; this skill owns post-auth init/_app patches
- **nextjs-frontend-scaffolding** — pattern pages thin → views (this skill is a fixed capture, not entity scaffold)
