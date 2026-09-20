# CLI reference

```bash
bash scripts/feature-cli.sh [--root <project>] <command> [args...]
bash scripts/validate.sh [--root <project>]
```

## init

```bash
bash scripts/feature-cli.sh --root "$ROOT" init --title="Novetec Ecommerce" --acronym=NOV \
  --sprint=1 --sprint-start=2026-08-01 --sprint-end=2026-08-14
```

Creates `FEATURES.yml`, `features/sprints/`, `features/changes.log`. Migrates legacy `ARCHIVE.yml` if needed.

## add

```bash
bash scripts/feature-cli.sh --root "$ROOT" add "Auth Gateway" "OAuth2"
bash scripts/feature-cli.sh --root "$ROOT" add --sprint=2 "Payments" "Stripe"
```

`sprint` defaults to current sprint number.

## update

```bash
bash scripts/feature-cli.sh --root "$ROOT" update --id=NOV-1 --sprint=2
bash scripts/feature-cli.sh --root "$ROOT" update --id=NOV-1 --status=done
bash scripts/feature-cli.sh --root "$ROOT" update --id=NOV-1 --status=deployed
```

Active statuses: `draft|in_progress|testing|blocked|done|deployed`.

## sprint / close-sprint

```bash
bash scripts/feature-cli.sh --root "$ROOT" sprint --number=1 --start=2026-08-01 --end=2026-08-14
bash scripts/feature-cli.sh --root "$ROOT" close-sprint --next-start=2026-08-15 --next-end=2026-08-28
```

`close-sprint` sets `closed_at` on `features/sprints/{current}.yml`, archives **done** and **deployed** features of that sprint, advances current sprint (default `current+1`).

## archive

```bash
bash scripts/feature-cli.sh --root "$ROOT" archive NOV-1
```

Writes to `features/sprints/{feature.sprint}.yml`.

## list / validate

`list` shows current sprint, files under `features/sprints/`, and active features with their planned sprint.

`validate` checks schema across FEATURES + all sprint archive files.
