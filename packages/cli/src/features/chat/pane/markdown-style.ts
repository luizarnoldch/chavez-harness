import { RGBA, SyntaxStyle } from "@opentui/core";

/** Shared SyntaxStyle for assistant markdown in the chat pane (Tokyo Night-ish palette). */
export const chatMarkdownStyle = SyntaxStyle.fromStyles({
  default: { fg: RGBA.fromHex("#c0caf5") },
  "markup.heading": { fg: RGBA.fromHex("#7aa2f7"), bold: true },
  "markup.heading.1": { fg: RGBA.fromHex("#7aa2f7"), bold: true },
  "markup.heading.2": { fg: RGBA.fromHex("#7aa2f7"), bold: true },
  "markup.heading.3": { fg: RGBA.fromHex("#7aa2f7"), bold: true },
  "markup.list": { fg: RGBA.fromHex("#e0af68") },
  "markup.bold": { fg: RGBA.fromHex("#c0caf5"), bold: true },
  "markup.strong": { fg: RGBA.fromHex("#c0caf5"), bold: true },
  "markup.italic": { fg: RGBA.fromHex("#c0caf5"), italic: true },
  "markup.link": { fg: RGBA.fromHex("#7aa2f7") },
  "markup.raw": { fg: RGBA.fromHex("#9ece6a") },
  "markup.raw.block": { fg: RGBA.fromHex("#9ece6a") },
  "markup.quote": { fg: RGBA.fromHex("#565f89") },
});
