# Atajos de teclado

> Generado por `bun run docs:registry` en `packages/cli`. No edites la tabla a mano.
> Fuente: `packages/cli/src/registry/shortcuts.ts`.

Cada atajo se define una sola vez en el registro. La UI (status bar, prompt, Tab) lee ese archivo.

| Id | Teclas | Alcance | Qué hace |
|----|--------|---------|----------|
| `toggle-mode` | Tab | global | Alterna el modo entre Plan y Build |
| `submit` | Enter | prompt | Envía el mensaje o ejecuta el comando seleccionado |
| `newline` | Shift+Enter | prompt | Inserta una línea nueva sin enviar |
| `clear-or-exit` | Ctrl+C | prompt | Limpia el input si tiene texto. Con el input vacío, el primero pide confirmación y el segundo cierra; otra tecla cancela. En la pantalla de auth, doble Ctrl+C cierra la app |
| `toggle-auth-mode` | Ctrl+R | auth | Alterna entre iniciar sesión y registrarse |
| `focus-prompt` | Esc | global | Devuelve el foco al input del chat si un click lo perdió. No borra el texto |
| `clear-input` | Esc | prompt | Limpia el input; Ctrl+Z lo restaura. No cierra la aplicación |
| `restore-input` | Ctrl+Z | prompt | Restaura el texto borrado con Ctrl+C o Esc |
| `command-prev` | ↑ | command-menu | En el menú /, selecciona el comando anterior. Si no, y el cursor está al inicio o el input está vacío, recupera el input anterior |
| `command-next` | ↓ | command-menu | En el menú /, selecciona el comando siguiente. Si no, y el cursor está al final con texto, pasa al siguiente input |
