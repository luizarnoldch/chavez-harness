# Dependencies

`scripts/install-deps.sh` installs any missing packages. Do not invent a different package list.

## Canonical commands

```bash
bun add drizzle-orm@rc pg dotenv
bun add -D drizzle-kit@rc tsx @types/pg
```

## Required package names (presence check)

| Package | Scope | Role |
|---------|-------|------|
| `drizzle-orm` | dependencies | ORM client (`node-postgres` driver) |
| `pg` | dependencies | PostgreSQL pool |
| `dotenv` | dependencies | Load `.env` in scripts / kit |
| `drizzle-kit` | devDependencies | `generate` / migrate CLI |
| `tsx` | devDependencies | Run TypeScript scripts |
| `@types/pg` | devDependencies | Types for `pg` |

## CLI

```bash
bash scripts/install-deps.sh --root <ROOT>
bash scripts/install-deps.sh --root <ROOT> --force-install
```

`main.sh` runs `install-deps` first unless `--skip-deps`.
