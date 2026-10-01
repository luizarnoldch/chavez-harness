"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** `reasoning` part, collapsed by default (mock "Thought for…" block). */
export function ReasoningBlock({ text }: { text: string }) {
  return (
    <Collapsible className="group/reasoning text-[13px]">
      <CollapsibleTrigger className="inline-flex min-h-8 items-center gap-1.5 font-medium text-faint transition-colors hover:text-muted-foreground">
        <Sparkles className="size-3.5" />
        <span>Razonamiento</span>
        <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/reasoning:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-0.5 mb-2 border-l-2 border-border pl-3 leading-relaxed whitespace-pre-wrap text-faint italic">
          {text}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
