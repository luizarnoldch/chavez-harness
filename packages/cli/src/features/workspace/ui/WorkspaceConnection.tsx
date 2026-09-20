import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { loadCredentials } from "../../auth/api/credentials.ts";
import {
  getWorkspaceBridge,
  type LinkStatus,
  type WorkspaceBridge,
  type WorkspaceBridgeState,
} from "../bridge.ts";

type WorkspaceConnectionValue = {
  bridge: WorkspaceBridge;
  state: WorkspaceBridgeState;
  ready: boolean;
  status: LinkStatus;
};

const WorkspaceConnectionContext = createContext<WorkspaceConnectionValue | null>(null);

export function useWorkspaceConnection(): WorkspaceConnectionValue {
  const value = useContext(WorkspaceConnectionContext);
  if (!value) {
    throw new Error("useWorkspaceConnection must be used within WorkspaceConnection");
  }
  return value;
}

type Props = {
  children: ReactNode;
};

export function WorkspaceConnection({ children }: Props) {
  const bridge = useMemo(() => getWorkspaceBridge(), []);
  const state = useSyncExternalStore(
    (cb) => bridge.subscribe(cb),
    () => bridge.getState(),
    () => bridge.getState(),
  );
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const creds = await loadCredentials();
        if (!creds?.sessionToken) {
          throw new Error("Sin credenciales");
        }
        await bridge.connect(creds.apiUrl, creds.sessionToken, process.cwd());
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : "Error de conexión");
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      void bridge.close();
    };
  }, [bridge]);

  const value = useMemo(
    () => ({
      bridge,
      state,
      ready,
      status: state.status,
    }),
    [bridge, state, ready],
  );

  if (!ready) {
    return (
      <box flexGrow={1} justifyContent="center" alignItems="center">
        <text fg="#888888">Conectando workspace…</text>
      </box>
    );
  }

  if (bootError && state.status === "disconnected") {
    return (
      <WorkspaceConnectionContext.Provider value={value}>
        <box flexGrow={1} flexDirection="column" padding={1}>
          <text fg="#f7768e">No se pudo vincular el workspace</text>
          <text fg="#888888">{bootError}</text>
          <text fg="#888888">La API debe estar en marcha (CHAVEZ_API_URL).</text>
          {children}
        </box>
      </WorkspaceConnectionContext.Provider>
    );
  }

  return (
    <WorkspaceConnectionContext.Provider value={value}>
      {children}
    </WorkspaceConnectionContext.Provider>
  );
}
