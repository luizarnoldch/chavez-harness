# Dependencies

`scripts/install-deps.sh` installs any missing packages. Do not invent a different package list.

## Canonical command

```bash
bun add better-auth
```

## Required package names (presence check)

| Package | Scope | Role |
|---------|-------|------|
| `better-auth` | dependencies | Auth server + drizzle adapter + Next.js helpers |

## CLI

```bash
bash scripts/install-deps.sh --root <ROOT>
bash scripts/install-deps.sh --root <ROOT> --force-install
```

`main.sh` runs `install-deps` first unless `--skip-deps`.

## Optional schema regenerate

```bash
bash scripts/generate.sh --root <ROOT>
# or
bash scripts/main.sh --root <ROOT> --force-generate
```

Canonical `auth-schema.ts` is the **asset snapshot**. Regenerating may diverge; re-capture the asset if validate fails after `--force-generate`.
