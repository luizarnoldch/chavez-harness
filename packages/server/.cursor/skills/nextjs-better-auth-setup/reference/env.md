# Environment variables

Synced via **nextjs-env-config** `add-env-var.sh` (invoked by this skill's `sync-env.sh`).
Never rewrite existing `.env` values.

| Key | Config field | Zod | Example / placeholder |
|-----|--------------|-----|------------------------|
| `BETTER_AUTH_SECRET` | `betterAuthSecret` | `z.string()` | (empty; comment `# rand - base64 32`) |
| `BETTER_AUTH_URL` | `betterAuthUrl` | `z.string().optional().default("http://localhost:3000")` | `http://localhost:3000` |

`auth-client.ts` uses `config.betterAuthUrl` (from `BETTER_AUTH_URL`).

`validate.sh` checks keys in `.env.example` **and** `betterAuthSecret` / `betterAuthUrl` in `src/lib/config.ts`.
