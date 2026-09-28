---
name: skill-pack
description: >-
  Carga skills de .cursor/skills de forma progresiva (scripts, references y
  assets). Usar cuando haga falta consultar una skill del harness sin leer
  carpetas enteras.
---

# Skill pack

No leas `references/` ni `assets/` de golpe. Resuelve la raíz de esta skill (el directorio que contiene este `SKILL.md`) y pide solo lo que necesitas.

1. Lista temas y snippets: `bash scripts/main.sh --list`
2. Un tema: `bash scripts/main.sh --topic <id>` (solo `references/<id>.md`)
3. Un snippet: `bash scripts/main.sh --asset <id>` (solo `assets/<id>.md`)

Ejecuta el script desde esta carpeta, o con la ruta absoluta a `scripts/main.sh`. Si el id no existe, el script sale con código 1: no inventes el contenido.
