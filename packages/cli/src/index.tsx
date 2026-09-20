import { createRoot } from "@opentui/react";
import { RouterProvider } from "react-router";
import { AuthGate } from "./features/auth/ui/AuthGate";
import { renderer } from "./app/renderer";
import { router } from "./app/routes";
import { DialogProvider } from "./lib/providers/Dialog";
import { ToastProvider } from "./lib/providers/Toast";

function App() {
  return (
    <ToastProvider>
      <DialogProvider>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </DialogProvider>
    </ToastProvider>
  );
}

createRoot(renderer).render(<App />);
