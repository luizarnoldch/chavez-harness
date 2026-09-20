# Dependencies

`scripts/install-deps.sh` installs any missing packages. Do not change asset file contents to match other versions.

## Canonical command

```bash
bun add @trpc/server @trpc/client @trpc/tanstack-react-query @tanstack/react-query@latest zod client-only server-only superjson react-error-boundary
```

## Required package names (presence check)

| Package | Role |
|---------|------|
| `@trpc/server` | Router + fetch adapter |
| `@trpc/client` | Browser/SSR HTTP client |
| `@trpc/tanstack-react-query` | `createTRPCContext` / `createTRPCOptionsProxy` |
| `@tanstack/react-query` | QueryClient + hydration (`@latest` when installing) |
| `zod` | Example `hello` input on `_app` router |
| `client-only` | Client-boundary helpers |
| `server-only` | Guard on `server.tsx` |
| `superjson` | Transformer (client + server + dehydrate) |
| `react-error-boundary` | Error boundaries used with Suspense/query UI |

## CLI

```bash
bash scripts/install-deps.sh --root <ROOT>
bash scripts/install-deps.sh --root <ROOT> --force-install   # full canonical bun add
```

`main.sh` runs `install-deps` first unless `--skip-deps`.
