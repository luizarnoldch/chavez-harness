# Layout del paquete

Cada skill vive en `.cursor/skills/<nombre>/` y es independiente del SDK (Cursor hoy; AI SDK después).

- `SKILL.md` — instrucciones y cuándo usarla
- `references/` — documentación por tema (`--topic`)
- `assets/` — snippets concretos (`--asset`)
- `scripts/main.sh` — único punto de entrada; no abras los directorios a mano
