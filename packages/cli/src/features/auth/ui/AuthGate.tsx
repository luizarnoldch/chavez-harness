import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSession, signOut } from "../api/api.ts";
import { clearCredentials, loadCredentials } from "../api/credentials.ts";
import { renderer } from "../../../app/renderer";
import { LoginScreen } from "./LoginScreen.tsx";

type AuthContextValue = {
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthGate");
  }
  return value;
}

type AuthGateProps = {
  children: ReactNode;
};

type GateState = "loading" | "login" | "ready";

export function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<GateState>("loading");

  const checkSession = useCallback(async () => {
    setState("loading");
    const creds = await loadCredentials();
    if (!creds) {
      setState("login");
      return;
    }
    const session = await getSession(creds);
    if (!session) {
      await clearCredentials();
      setState("login");
      return;
    }
    setState("ready");
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    await signOut();
    setState("login");
  }, []);

  const ctx = useMemo(() => ({ logout }), [logout]);

  if (state === "loading") {
    return (
      <box flexGrow={1} justifyContent="center" alignItems="center">
        <text fg="#888888">Comprobando sesión…</text>
      </box>
    );
  }

  if (state === "login") {
    return (
      <AuthContext.Provider value={ctx}>
        <LoginScreen
          onSuccess={() => setState("ready")}
          onExit={() => {
            renderer.destroy();
          }}
        />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}
