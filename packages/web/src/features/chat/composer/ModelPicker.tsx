"use client";

import { Fragment, useMemo } from "react";
import { ChevronDown, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  choiceKey,
  parseChoiceKey,
  selectableModelGroups,
  type ModelChoice,
} from "./model-options";

type ModelPickerProps = {
  value: ModelChoice;
  onChange: (choice: ModelChoice) => void;
  disabled?: boolean;
  className?: string;
};

/** Model for the next message; sent as `provider` / `model` on `chat.send`. */
export function ModelPicker({ value, onChange, disabled, className }: ModelPickerProps) {
  const groups = useMemo(() => selectableModelGroups(), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Modelo: ${value.model}`}
        className={cn(
          "inline-flex min-h-8 max-w-[52%] min-w-0 shrink items-center gap-1 rounded-full bg-muted px-2.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
          className,
        )}
      >
        <Cpu className="size-3 shrink-0" />
        <span className="truncate">{value.model}</span>
        <ChevronDown className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuRadioGroup
          value={choiceKey(value)}
          onValueChange={(key) => onChange(parseChoiceKey(key))}
        >
          {groups.map((group, idx) => (
            <Fragment key={group.provider}>
              {idx > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.models.map((model) => (
                <DropdownMenuRadioItem
                  key={`${group.provider}:${model}`}
                  value={choiceKey({ provider: group.provider, model })}
                  className="font-mono text-xs"
                >
                  {model}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
