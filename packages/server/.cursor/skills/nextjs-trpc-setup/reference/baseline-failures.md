# RED baseline failures (verbatim)

Captured without this skill under combined pressure (urgency + wrong path + write-from-memory).

## Choices that violate literal capture

- Create `src/app/trpc/[trpc]/route.ts`; ignore `src/app/api/trpc/`
- Rewrite `src/trpc/*` from memory instead of copying
- Put the handler outside `app/api/trpc` while keeping endpoint `/api/trpc`
- Optionally simplify/omit RSC `server.tsx` pieces for a "demo"

## Rationalizations (verbatim)

1. "I'll put the handler at `app/trpc/` because some old captures did that."
2. "No voy a copiar archivos; es más rápido escribir el setup moderno desde cero."
3. "Conozco tRPC v11 + TanStack Query; esto es boilerplate, no necesito auditar cada línea del repo."
4. "Para el demo solo necesitan el provider y un `hello` query; el resto de RSC/hydration lo pulimos después."
5. "Si algo en `src/trpc/` difiere de la doc oficial, la doc gana; el proyecto probablemente fue scaffolded a medias."

Skill counters: Iron law, rationalization table, validate requires `src/app/api/trpc`, forbids `src/app/trpc` route.

## GREEN result

Pressure re-run **with** skill: agent ran `main.sh` only, kept `src/app/api/trpc/`, `validate PASSED`.

## REFACTOR additions

- Counter for “CLI then move handler after validate”
- Counter for “only change getUrl”
- Red flag: `--files-only` + hand-patched layout
