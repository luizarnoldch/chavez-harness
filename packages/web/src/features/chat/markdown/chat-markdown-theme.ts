import { createThemeCss } from "@tanstack/highlight/theme";
import { githubDarkTheme } from "@tanstack/highlight/themes/github-dark";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

/** Highlight CSS following <html class="dark">, on paper+wire sunken surfaces. */
export const chatMarkdownHighlightCss = `${createThemeCss({
  light: { ...githubLightTheme, background: "#e7eae5" },
  dark: { ...githubDarkTheme, background: "#0f1215" },
  lightSelector: ".chat-markdown",
  darkSelector: ".dark .chat-markdown",
  codeBlockSelector: ".chat-markdown pre.tm-code",
  lineNumbersSelector: ".chat-markdown .tm-code--line-numbers",
})}

.chat-markdown .th-line--highlighted {
  background: color-mix(in srgb, var(--th-token) 12%, transparent);
}
`;
