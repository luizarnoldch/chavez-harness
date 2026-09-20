import { useToast, type ToastKind } from "./Toast";

const TOAST_FG: Record<ToastKind, string> = {
  success: "#9ece6a",
  info: "#7aa2f7",
  error: "#f7768e",
};

export function Toast() {
  const { current } = useToast();
  if (!current) return null;

  return (
    <box height={1} backgroundColor="#1f2335" paddingLeft={1}>
      <text fg={TOAST_FG[current.kind]}>{current.message}</text>
    </box>
  );
}
