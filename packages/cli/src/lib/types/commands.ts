import type { ToastKind } from "./toast";

export type CommandContext = {
  exit: () => void;
  newSession: () => void;
  logout: () => void | Promise<void>;
  toast: (message: string, kind: ToastKind) => void;
  dialog: {
    open: (id: string) => void;
    close: () => void;
  };
};

export type Command = {
  name: string;
  description: string;
  value: string;
  action?: (ctx: CommandContext) => void | Promise<void>;
};
