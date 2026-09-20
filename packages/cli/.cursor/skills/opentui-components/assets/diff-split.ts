import { DiffRenderable, SyntaxStyle, RGBA, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer()

const syntaxStyle = SyntaxStyle.fromStyles({
  default: { fg: RGBA.fromHex("#E6EDF3") },
  string: { fg: RGBA.fromHex("#A5D6FF") },
  keyword: { fg: RGBA.fromHex("#FF7B72"), bold: true },
})

const patch = `diff --git a/app.ts b/app.ts
index 1111111..2222222 100644
--- a/app.ts
+++ b/app.ts
@@ -1,3 +1,3 @@
 setup()
-const a = 1
+const a = 2
 ready(a)
`

const diff = new DiffRenderable(renderer, {
  id: "diff",
  width: "100%",
  height: 16,
  diff: patch,
  view: "split",
  syncScroll: true,
  filetype: "typescript",
  syntaxStyle,
  showLineNumbers: true,
})

renderer.root.add(diff)
