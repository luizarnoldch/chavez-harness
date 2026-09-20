import type { Command, CommandContext } from "../types/commands";

/** Hint de la status bar: el menú se abre al escribir / en el prompt. */
export const COMMAND_MENU_HINT = "/ comandos";

export const COMMANDS: Command[] = [
  {
    name: "new",
    description: "Nueva conversación",
    value: "/new",
    action: (ctx: CommandContext) => {
      ctx.newSession();
      ctx.toast("Conversación reiniciada", "success");
    },
  },
  {
    name: "exit",
    description: "Salir de la aplicación",
    value: "/exit",
    action: (ctx: CommandContext) => {
      ctx.exit();
    },
  },
  {
    name: "models",
    description: "Elige el modelo del chat",
    value: "/models",
    action: (ctx: CommandContext) => {
      ctx.dialog.open("models");
    },
  },
];
