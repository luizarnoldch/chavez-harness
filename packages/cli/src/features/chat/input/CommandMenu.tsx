import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useEffect, useRef } from "react";
import { getFilterCommands } from "../../../lib/filter-commands";

const MAX_VISIBLE_COMMANDS = 8;

type CommandMenuProps = {
  query: string;
  selectedIndex: number;
};

type CommandRow = {
  name: string;
  description: string;
  value: string;
};

export function CommandMenu({ query, selectedIndex }: CommandMenuProps) {
  if (!query.startsWith("/")) return null;

  const commands = getFilterCommands(query.slice(1));
  if (commands.length === 0) {
    return (
      <box height={3} border borderColor="#414868" paddingLeft={1} paddingRight={1}>
        <text fg="#888888">Sin comandos</text>
      </box>
    );
  }

  const safeIndex = Math.min(selectedIndex, commands.length - 1);
  const visibleRows = Math.min(commands.length, MAX_VISIBLE_COMMANDS);

  return (
    <CommandMenuList
      commands={commands}
      safeIndex={safeIndex}
      visibleRows={visibleRows}
    />
  );
}

type CommandMenuListProps = {
  commands: CommandRow[];
  safeIndex: number;
  visibleRows: number;
};

function CommandMenuList({
  commands,
  safeIndex,
  visibleRows,
}: CommandMenuListProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`cmd-${safeIndex}`);
  }, [safeIndex]);

  return (
    <box border borderColor="#7aa2f7" title="Commands" height={visibleRows + 2}>
      <scrollbox ref={scrollRef} height={visibleRows} flexGrow={1}>
        {commands.map((command, index) => {
          const selected = index === safeIndex;
          return (
            <box
              key={command.value}
              id={`cmd-${index}`}
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected ? "#334455" : undefined}
              flexDirection="row"
            >
              <text fg={selected ? "#FFFF00" : "#FFFFFF"}>{command.value}</text>
              <text attributes={TextAttributes.DIM}> — {command.description}</text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
