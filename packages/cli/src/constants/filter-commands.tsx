import { COMMANDS } from "../registry/commands";
import type { Command } from "../types/commands";

export function getFilterCommands(query: string): Command[] {
  const lowerCaseQuery = query.toLowerCase();
  return COMMANDS.filter((command) =>
    command.name.toLowerCase().includes(lowerCaseQuery) ||
    command.description.toLowerCase().includes(lowerCaseQuery)
  );
}
