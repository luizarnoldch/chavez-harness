# Feature-management handoff

`prd-authoring` never writes `FEATURES.yml` and never invokes `feature-cli.sh`. After `create`, stdout includes a stable handoff block. The agent loads **feature-management** and runs `link-prd` when `action` is `link-prd`.

## When `--feature` was passed

```
HANDOFF:feature-management
action: link-prd
id: NOV-1
path: features/tasks/prd-catalog-backend/prd.md
order: 1
execution: sequential
```

Then:

```bash
bash <feature-management-skill>/scripts/feature-cli.sh --root "$ROOT" \
  link-prd NOV-1 'features/tasks/prd-catalog-backend/prd.md' 1 sequential
```

`path` is relative to `--root`. `order` defaults to `1`. `execution` defaults to `sequential`. Tickets use the same `link-prd` command (`prds[].path` may point at `features/tasks/ticket-<slug>/ticket.md`).

## When `--feature` was omitted

```
HANDOFF:feature-management
action: none
path: features/tasks/prd-catalog-backend/prd.md
note: Document created. Link later with feature-management: link-prd <ID> <path> <order> sequential|parallel
```

## Agent rules

- Do not skip the handoff when `action: link-prd`.
- Do not implement `link-prd` by editing YAML.
- Completing work later is also feature-management: `update --id=... --complete-prd=<path>`.
- Creating the document and linking it are two skills; run them in that order in one session when `id` is known.
