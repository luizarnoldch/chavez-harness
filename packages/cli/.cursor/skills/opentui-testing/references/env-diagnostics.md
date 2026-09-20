# Env diagnostics

Subset of OpenTUI env vars useful when debugging tests or render hangs. Set before the read time. Registered booleans treat `true`, `1`, `on`, `yes` as true (case-insensitive).

| Variable | Purpose |
|----------|---------|
| `OTUI_SHOW_STATS` | Native statistics overlay at renderer creation |
| `SHOW_CONSOLE` | Open console overlay at startup |
| `OTUI_DEBUG` | Retain raw input sequences for `getDebugInputs()` (sensitive) |
| `OTUI_STDIN_LOG` | Write raw stdin bytes to a file (sensitive; truncate on start) |
| `OTUI_DUMP_CAPTURES` | Dump stdout/console caches from exit handler |
| `OTUI_NO_NATIVE_RENDER` | Skip Zig native frame renderer; loop still runs; split-footer may still write ANSI |
| `OTUI_DEBUG_FFI` | FFI debug logging |
| `OTUI_TRACE_FFI` | FFI tracing |

Remove after investigation. Input/output captures can contain secrets.

`OTUI_NO_NATIVE_RENDER` does not stop the render loop. `OTUI_DUMP_CAPTURES` runs from the exit handler — calling `renderer.destroy()` directly does not trigger that dump by itself.

## Related

`--topic rendering-diagnostics`
