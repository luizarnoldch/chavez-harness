import { createRoot } from "@opentui/react";
import { RouterProvider } from "react-router";
import { AuthGate } from "./features/auth/ui/AuthGate";
import { renderer } from "./app/renderer";
import { AutoCopySelection } from "./features/selection/AutoCopySelection";
import { router } from "./app/routes";
import { getWorkspaceBridge } from "./features/workspace/bridge.ts";
import { WorkspaceConnection } from "./features/workspace/ui/WorkspaceConnection";
import { DialogProvider } from "./lib/providers/Dialog";
import { ToastProvider } from "./lib/providers/Toast";

function App() {
  return (
    <ToastProvider>
      <AutoCopySelection />
      <DialogProvider>
        <AuthGate>
          <WorkspaceConnection>
            <RouterProvider router={router} />
          </WorkspaceConnection>
        </AuthGate>
      </DialogProvider>
    </ToastProvider>
  );
}

async function shutdown() {
  await getWorkspaceBridge().close();
}

process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});
process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

createRoot(renderer).render(<App />);
