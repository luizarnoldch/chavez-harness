"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { ModePill, type ChatMode } from "./ModePill";
import { ModelPicker } from "./ModelPicker";
import type { ModelChoice } from "./model-options";

const MAX_HEIGHT = 180;

type ComposerProps = {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  model: ModelChoice;
  onModelChange: (choice: ModelChoice) => void;
  /** Resolves when sent; rejects to give the text back to the textarea. */
  onSend: (text: string) => Promise<void>;
  /** Not linked / not loaded: everything disabled. */
  disabled?: boolean;
  /** A reply is in flight: typing allowed, sending not. */
  busy?: boolean;
  placeholder?: string;
};

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Autogrow textarea + mode / model pills + send. Enter sends, Shift+Enter
 * breaks the line (on touch keyboards Enter stays a newline, as in the mock).
 * No Stop button: the server cannot cancel a generation.
 */
export function Composer({
  mode,
  onModeChange,
  model,
  onModelChange,
  onSend,
  disabled,
  busy,
  placeholder,
}: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && !busy && text.trim().length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  async function submit() {
    const value = text.trim();
    if (!value || !canSend) return;
    setText("");
    try {
      await onSend(value);
    } catch {
      setText((current) => (current ? current : value));
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (isCoarsePointer()) return;
    event.preventDefault();
    void submit();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-1 rounded-[18px] border border-border-strong bg-card pt-2 pr-2 pb-1 pl-3 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        enterKeyHint="send"
        aria-label="Mensaje"
        placeholder={placeholder ?? "Escribe un mensaje…"}
        disabled={disabled}
        className="max-h-[180px] min-h-[26px] w-full resize-none bg-transparent py-1 pr-1 text-base leading-[1.45] outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="flex min-w-0 items-center gap-1">
        <ModePill mode={mode} onChange={onModeChange} disabled={disabled} />
        <ModelPicker value={model} onChange={onModelChange} disabled={disabled} />
        <span className="flex-1" />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!canSend}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );
}
