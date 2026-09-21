import { createThemeCss } from "@tanstack/highlight/theme";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";
import { nordTheme } from "@tanstack/highlight/themes/nord";

/** Highlight CSS aligned with the app's dark-first Tokyo Night chrome (Nord tokens). */
export const chatMarkdownHighlightCss = `${createThemeCss({
  light: githubLightTheme,
  dark: nordTheme,
  lightSelector: ".chat-markdown",
  darkSelector: ".dark .chat-markdown, :root .chat-markdown",
  codeBlockSelector: ".chat-markdown pre.tm-code",
  lineNumbersSelector: ".chat-markdown .tm-code--line-numbers",
})}

.chat-markdown .th-line--highlighted {
  background: color-mix(in srgb, var(--th-token) 12%, transparent);
}
`;
