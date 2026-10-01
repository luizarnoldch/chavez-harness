"use client";

import { useMemo, useState, type FormEvent } from "react";
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_PROVIDER } from "@chavez-harness/shared";
import { Folder, Hammer, ListChecks, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createSession } from "@/lib/api";
import { prettyPath } from "@/lib/format";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { MODE_HINT, type ChatMode } from "@/features/chat/composer/ModePill";
import {
  choiceKey,
  parseChoiceKey,
  selectableModelGroups,
} from "@/features/chat/composer/model-options";

type NewSessionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspacePath: string | null;
};

/** "Nueva sesión": mode + model from `listSelectableChatModels()`, then open the chat. */
export function NewSessionSheet({ open, onOpenChange, workspaceId, workspacePath }: NewSessionSheetProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const groups = useMemo(() => selectableModelGroups(), []);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<ChatMode>("plan");
  const [modelKey, setModelKey] = useState(
    choiceKey({ provider: DEFAULT_CHAT_PROVIDER, model: DEFAULT_CHAT_MODEL }),
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const { provider, model } = parseChoiceKey(modelKey);
      const session = await createSession(workspaceId, {
        title: title.trim() || undefined,
        mode,
        provider,
        model,
      });
      window.location.href = `/sessions/${session.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sesión");
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={desktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl"}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading text-lg font-bold">Nueva sesión</SheetTitle>
          <SheetDescription>Elige modo y modelo; podrás cambiarlos desde el chat.</SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
          {workspacePath ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-strong">
                <Folder className="size-4" />
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground" title={workspacePath}>
                {prettyPath(workspacePath)}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ns-title">
              Título <span className="font-normal text-faint">(opcional)</span>
            </Label>
            <Input
              id="ns-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Revisar el flujo de sync"
              className="h-10 text-base sm:text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Modo</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode}
              onValueChange={(value) => {
                if (value === "plan" || value === "build") setMode(value);
              }}
              className="w-full"
            >
              <ToggleGroupItem value="plan" className="flex-1">
                <ListChecks />
                Plan
              </ToggleGroupItem>
              <ToggleGroupItem value="build" className="flex-1">
                <Hammer />
                Build
              </ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-faint">{MODE_HINT[mode]}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ns-model">Modelo</Label>
            <Select value={modelKey} onValueChange={setModelKey}>
              <SelectTrigger id="ns-model" className="w-full font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {groups.map((group) => (
                  <SelectGroup key={group.provider}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.models.map((model) => (
                      <SelectItem
                        key={`${group.provider}:${model}`}
                        value={choiceKey({ provider: group.provider, model })}
                        className="font-mono text-xs"
                      >
                        {model}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-faint">
              Cursor necesita tu API key en Proveedores; <code className="font-mono">eco</code> es el
              mock local.
            </span>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="mt-auto h-11 w-full text-base" disabled={creating}>
            <Send />
            {creating ? "Creando…" : "Crear sesión"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
