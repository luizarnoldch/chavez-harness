"use client";

import type { ComponentPropsWithoutRef } from "react";
import { streamingMarkdownExtension } from "@tanstack/markdown/extensions/streaming";
import { Markdown } from "@tanstack/markdown/react";
import { highlightChatMarkdownCode } from "./chat-highlighter";
import { chatMarkdownHighlightCss } from "./chat-markdown-theme";

const streamingExtensions = [streamingMarkdownExtension()];

function MarkdownLink(props: ComponentPropsWithoutRef<"a">) {
  const { href, children, ...rest } = props;
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-90"
    >
      {children}
    </a>
  );
}

type ChatMarkdownProps = {
  source: string;
  className?: string;
};

/** Inject once per chat view — Highlight theme variables for fence tokens. */
export function ChatMarkdownStyles() {
  return <style>{chatMarkdownHighlightCss}</style>;
}

/**
 * Renders assistant markdown from the durable source string.
 * Re-parses the full accumulated text on each update (no incremental parser state).
 */
export function ChatMarkdown({ source, className }: ChatMarkdownProps) {
  return (
    <div className={["chat-markdown", className].filter(Boolean).join(" ")}>
      <Markdown
        extensions={streamingExtensions}
        frontmatter={false}
        headingIds={false}
        highlighter={highlightChatMarkdownCode}
        codeLineNumbers
        components={{ a: MarkdownLink }}
      >
        {source}
      </Markdown>
    </div>
  );
}
