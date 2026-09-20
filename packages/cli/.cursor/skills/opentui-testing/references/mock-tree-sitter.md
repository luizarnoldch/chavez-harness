# MockTreeSitterClient

Subclasses `TreeSitterClient` without starting a worker. `highlightOnce()` stays pending until the test resolves it. An optional clock-backed timeout can resolve it automatically.

```ts
const { MockTreeSitterClient } = await import("@opentui/core/testing")

const client = new MockTreeSitterClient()
client.setMockResult({ highlights: [[0, 5, "keyword"]] })

const pending = client.highlightOnce("const", "typescript")
client.resolveHighlightOnce()

try {
  console.log(await pending)
} finally {
  await client.destroy()
}
```

## Controls

`setMockResult`, `resolveHighlightOnce(index = 0)`, `resolveAllHighlightOnce`, `isHighlighting`.

Each resolution uses the current mock result. `destroy()` resolves all pending highlights before normal client cleanup. Constructor options: `autoResolveTimeout`, `clock`.

## Related

`--asset mock-tree-sitter`
