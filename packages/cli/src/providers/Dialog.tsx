import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type DialogContextValue = {
  current: string | null;
  open: (id: string) => void;
  close: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<string | null>(null);
  const open = useCallback((id: string) => {
    setCurrent(id);
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
  }, []);

  return (
    <DialogContext.Provider value={{ current, open, close }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return value;
}
