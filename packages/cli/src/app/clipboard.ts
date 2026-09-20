import {
  createClipboard,
  createHostClipboard,
  createRendererClipboardAdapter,
} from "@opentui/core";
import { renderer } from "./renderer";

export const clipboard = createClipboard({
  host: createHostClipboard(),
  terminal: createRendererClipboardAdapter(renderer),
});

renderer.on("destroy", () => {
  void clipboard.dispose();
});
