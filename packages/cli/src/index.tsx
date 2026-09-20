import { createRoot } from "@opentui/react";
import { RouterProvider } from "react-router";
import { AuthGate } from "./auth/AuthGate";
import { renderer } from "./renderer";
import { router } from "./routes";
import { DialogProvider } from "./providers/Dialog";
import { ToastProvider } from "./providers/Toast";

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
