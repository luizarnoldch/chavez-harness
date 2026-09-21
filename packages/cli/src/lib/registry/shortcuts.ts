export type ShortcutScope = "global" | "prompt" | "command-menu" | "auth";

export type ShortcutChord = {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type TextareaShortcutAction = "submit" | "newline";

export type Shortcut = {
  id: string;
  label: string;
  description: string;
  scope: ShortcutScope;
  keys: ShortcutChord[];
  hint?: string;
  textareaAction?: TextareaShortcutAction;
};

export const SHORTCUTS: Shortcut[] = [
  {
    id: "toggle-mode",
    label: "Tab",
    description: "Alterna Plan (solo lectura) y Build (herramientas completas)",
    scope: "global",
    keys: [{ name: "tab" }],
    hint: "Tab modo",
  },
  {
    id: "cycle-model",
    label: "Ctrl+M",
    description: "Cicla el modelo entre local y cursor disponibles",
    scope: "global",
    keys: [{ name: "m", ctrl: true }],
    hint: "Ctrl+M modelo",
  },
  {
    id: "toggle-status-panel",
    label: "Ctrl+U",
    description: "Abre o cierra el panel de información de la barra de estado",
    scope: "global",
    keys: [{ name: "u", ctrl: true }],
    hint: "Ctrl+U info",
  },
  {
    id: "submit",
    label: "Enter",
    description: "Envía el mensaje o ejecuta el comando seleccionado",
    scope: "prompt",
    keys: [{ name: "return" }, { name: "kpenter" }],
    textareaAction: "submit",
  },
  {
    id: "newline",
    label: "Shift+Enter",
    description: "Inserta una línea nueva sin enviar",
    scope: "prompt",
    keys: [
      { name: "return", shift: true },
      { name: "kpenter", shift: true },
    ],
    textareaAction: "newline",
  },
  {
    id: "clear-or-exit",
    label: "Ctrl+C",
    description: "Limpia el input si tiene texto. Con el input vacío, el primero pide confirmación y el segundo cierra; otra tecla cancela. En la pantalla de auth, doble Ctrl+C cierra la app",
    scope: "prompt",
    keys: [{ name: "c", ctrl: true }],
  },
  {
    id: "toggle-auth-mode",
    label: "Ctrl+R",
    description: "Alterna entre iniciar sesión y registrarse",
    scope: "auth",
    keys: [{ name: "r", ctrl: true }],
  },
  {
    id: "reveal-password",
    label: "F2",
    description: "Alterna mostrar u ocultar la contraseña en la pantalla de auth",
    scope: "auth",
    keys: [{ name: "f2" }],
  },
  {
    id: "focus-prompt",
    label: "Esc",
    description: "Devuelve el foco al input del chat si un click lo perdió. No borra el texto",
    scope: "global",
    keys: [{ name: "escape" }],
    hint: "Esc foco",
  },
  {
    id: "sessions-delete",
    label: "Ctrl+D",
    description: "En el listado /sessions, elimina la conversación seleccionada",
    scope: "global",
    keys: [{ name: "d", ctrl: true }],
    hint: "Ctrl+D borrar sesión",
  },
  {
    id: "clear-input",
    label: "Esc",
    description: "Limpia el input; Ctrl+Z lo restaura. No cierra la aplicación",
    scope: "prompt",
    keys: [{ name: "escape" }],
  },
  {
    id: "restore-input",
    label: "Ctrl+Z",
    description: "Restaura el texto borrado con Ctrl+C o Esc",
    scope: "prompt",
    keys: [{ name: "z", ctrl: true }],
  },
  {
    id: "command-prev",
    label: "↑",
    description: "En el menú /, selecciona el comando anterior. Si no, y el cursor está al inicio o el input está vacío, recupera el input anterior",
    scope: "command-menu",
    keys: [{ name: "up" }],
  },
  {
    id: "command-next",
    label: "↓",
    description: "En el menú /, selecciona el comando siguiente. Si no, y el cursor está al final con texto, pasa al siguiente input",
    scope: "command-menu",
    keys: [{ name: "down" }],
  },
];

export function getShortcut(id: string): Shortcut {
  const shortcut = SHORTCUTS.find((item) => item.id === id);
  if (!shortcut) {
    throw new Error(`Shortcut not found: ${id}`);
  }
  return shortcut;
}

export function promptTextareaKeyBindings() {
  return SHORTCUTS.flatMap((shortcut) => {
    const action = shortcut.textareaAction;
    if (!action) return [];
    return shortcut.keys.map((key) => ({
      name: key.name,
      ctrl: key.ctrl,
      shift: key.shift,
      meta: key.meta,
      action,
    }));
  });
}

export function statusBarHints(): string {
  return SHORTCUTS.flatMap((shortcut) => (shortcut.hint ? [shortcut.hint] : [])).join(
    " · ",
  );
}
