import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSession, signOut, type SessionUser } from "../api/api.ts";
import { clearCredentials, loadCredentials } from "../api/credentials.ts";
import { renderer } from "../../../app/renderer";
import { LoginScreen } from "./LoginScreen.tsx";

type AuthContextValue = {
  user: SessionUser | null;
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
  const [user, setUser] = useState<SessionUser | null>(null);

  const checkSession = useCallback(async () => {
    setState("loading");
    const creds = await loadCredentials();
    if (!creds) {
      setUser(null);
      setState("login");
      return;
    }
    const session = await getSession(creds);
    if (!session) {
      await clearCredentials();
      setUser(null);
      setState("login");
      return;
    }
    setUser(session);
    setState("ready");
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setState("login");
  }, []);

  const ctx = useMemo(() => ({ user, logout }), [user, logout]);

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
          onSuccess={() => {
            void checkSession();
          }}
          onExit={() => {
            renderer.destroy();
          }}
        />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}
