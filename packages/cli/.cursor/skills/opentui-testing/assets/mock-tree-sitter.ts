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
