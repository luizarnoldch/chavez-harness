# Service catalog

Filesystem discovery: any `assets/compose/<id>.yml` except `header.yml` is a
service id. Optional companions:

| Path                              | Role                                                             |
| --------------------------------- | ---------------------------------------------------------------- |
| `assets/compose/<id>.yml`         | Indented service block (`  <compose_key>:`)                      |
| `assets/compose/volumes/<id>.yml` | Top-level volume entry (`  <volume_key>:`)                       |
| `assets/env/<id>.env`             | `KEY=default` lines for append-only `.env` / `.env.example` sync |

`{{PROJECT}}` in compose fragments is replaced by `--project` (e.g. `novetec`).

## Built-in services

### postgres

- Compose key: `db`
- Volume: `db-data`
- Image: `postgres:18-alpine`
- Env keys: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`

Defaults (`assets/env/postgres.env`):

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@db:5432/app
```

### minio

- Compose key: `minio`
- Volume: `minio_data`
- Image: `minio/minio:latest`
- Env keys: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MINIO_BROWSER_REDIRECT_URL`

Defaults (`assets/env/minio.env`):

```
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BROWSER_REDIRECT_URL=http://localhost:9001
```

## Adding a service

1. Create `assets/compose/<id>.yml` with a two-space-indented compose key.
2. If needed, create `assets/compose/volumes/<id>.yml`.
3. Create `assets/env/<id>.env` with defaults.
4. Document the service in this file.
5. Verify with `list-services.sh` and `stack.sh --services <id>`.
