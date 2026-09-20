# Layout integration

Target file: `src/app/layout.tsx`

## Required

1. Import: `import { TRPCReactProvider } from "@/trpc/client";`
2. JSX: wrap the layout's `{children}` with `<TRPCReactProvider>{children}</TRPCReactProvider>`

## Rules

- Apply only via `scripts/patch-layout.sh --root <ROOT>` (or `main.sh`).
- Idempotent: if import + provider already present → no-op.
- Do not replace fonts, metadata, or other providers unless they already wrap children — nest `TRPCReactProvider` around `{children}` only.

## Snippet reference

See `assets/layout-provider.snippet.tsx`.
