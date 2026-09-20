import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const TOAST_MS = 4000;

export type ToastKind = "success" | "info" | "error";

type ToastNotice = {
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  current: ToastNotice | null;
  show: (message: string, kind: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastNotice | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const show = useCallback((message: string, kind: ToastKind) => {
    clearTimer();
    setCurrent({ message, kind });
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      timerRef.current = null;
    }, TOAST_MS);
  }, []);

  useEffect(() => clearTimer, []);

  return (
    <ToastContext.Provider value={{ current, show }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
