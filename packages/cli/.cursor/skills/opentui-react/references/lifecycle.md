# Lifecycle and cleanup

The React root does not own the renderer. `root.unmount()` removes the React tree and runs React effect cleanup while the renderer stays active. `renderer.destroy()` releases the terminal and renderer resources. It also unmounts the React root.

The code that creates the renderer owns `renderer.destroy()`. Call it on every application shutdown path. See Lifecycle and cleanup for signal and failure handling.
