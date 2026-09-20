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
    },
  },
  {
    name: "sessions",
    description: "Listar conversaciones del workspace",
    value: "/sessions",
    action: (ctx: CommandContext) => {
      ctx.dialog.open("sessions");
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
    name: "connect",
    description: "Conectar provider (API key)",
    value: "/connect",
    action: (ctx: CommandContext) => {
      ctx.dialog.open("connect");
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
  {
    name: "logout",
    description: "Cerrar sesión",
    value: "/logout",
    action: (ctx: CommandContext) => {
      void ctx.logout();
      ctx.toast("Sesión cerrada", "success");
    },
  },
];
