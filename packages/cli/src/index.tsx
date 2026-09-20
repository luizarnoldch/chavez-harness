import { createRoot } from "@opentui/react";
import { RouterProvider } from "react-router";
import { renderer } from "./renderer";
import { router } from "./routes";
import { DialogProvider } from "./providers/Dialog";
import { ToastProvider } from "./providers/Toast";

function App() {
  return (
    <ToastProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </ToastProvider>
  );
}

createRoot(renderer).render(<App />);
