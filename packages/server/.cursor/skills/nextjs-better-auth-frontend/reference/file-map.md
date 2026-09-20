# File map (asset → destination)

All paths relative to skill `assets/` and target project root.

| Asset | Destination |
|-------|-------------|
| `features/auth/components/AuthSignInForm.tsx` | `src/features/auth/components/AuthSignInForm.tsx` |
| `features/auth/components/AuthSignUpForm.tsx` | `src/features/auth/components/AuthSignUpForm.tsx` |
| `features/auth/hooks/useSignIn.tsx` | `src/features/auth/hooks/useSignIn.tsx` |
| `features/auth/hooks/useSignUp.tsx` | `src/features/auth/hooks/useSignUp.tsx` |
| `features/auth/hooks/useSignOut.tsx` | `src/features/auth/hooks/useSignOut.tsx` |
| `features/auth/schemas/auth.schema.ts` | `src/features/auth/schemas/auth.schema.ts` |
| `features/auth/server/auth.repository.ts` | `src/features/auth/server/auth.repository.ts` |
| `features/auth/server/auth.service.ts` | `src/features/auth/server/auth.service.ts` |
| `features/auth/server/auth.router.ts` | `src/features/auth/server/auth.router.ts` |
| `features/auth/views/SignInView.tsx` | `src/features/auth/views/SignInView.tsx` |
| `features/auth/views/SignUpView.tsx` | `src/features/auth/views/SignUpView.tsx` |
| `app/(auth)/layout.tsx` | `src/app/(auth)/layout.tsx` |
| `app/(auth)/sign-in/page.tsx` | `src/app/(auth)/sign-in/page.tsx` |
| `app/(auth)/sign-up/page.tsx` | `src/app/(auth)/sign-up/page.tsx` |
| `app/dashboard/page.tsx` | `src/app/dashboard/page.tsx` |
| `proxy.ts` | `src/proxy.ts` |
| `trpc/init.ts` | installed via `patch-init.sh` → `src/trpc/init.ts` |

## Patched (not file_map copy)

| Target | Script |
|--------|--------|
| `src/trpc/init.ts` | `patch-init.sh` — headers context + `protectedProcedure` |
| `src/trpc/routers/_app.ts` | `patch-app-router.sh` — `auth: authRouter` |

## Flow

UI forms → TanStack Form + `trpc.auth.*` mutations → `auth.service` → `auth.api.*` (better-auth server). Session guards in `src/proxy.ts`.
