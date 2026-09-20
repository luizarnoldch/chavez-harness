import { nextSelectableChatModel } from "@chavez-harness/shared";
import { useKeyboard } from "@opentui/react";
import { useEffect, useMemo, useState } from "react";
import {
  Outlet,
  useFetcher,
  useMatches,
  useNavigate,
  useNavigation,
  useRevalidator,
  useRouteLoaderData,
  useSubmit,
} from "react-router";
import { useAuth } from "../features/auth/ui/AuthGate";
import { CHAT_FETCHER_KEY } from "../features/chat/pane/ChatPane";
import { CommandMenu } from "../features/chat/input/CommandMenu";
import { MessageList } from "../features/chat/pane/MessageList";
import { ModelsDialog } from "../features/chat/dialogs/ModelsDialog";
import { SessionsDialog } from "../features/chat/dialogs/SessionsDialog";
import { ConnectDialog } from "../features/providers/ui/ConnectDialog";
import { Prompt } from "../features/chat/input/Prompt";
import { SessionFooter } from "../features/chat/chrome/SessionFooter";
import { StatusBar } from "../features/chat/chrome/StatusBar";
import { StatusInfoPanel } from "../features/chat/chrome/StatusInfoPanel";
import {
  DEFAULT_SESSION_MODEL,
  DEFAULT_SESSION_PROVIDER,
} from "../features/session/model";
import type { Session } from "../features/session/store";
import { shortSessionId } from "../features/session/store";
import { useWorkspaceConnection } from "../features/workspace/ui/WorkspaceConnection";
import { useDialog } from "../lib/providers/Dialog";
import { useToast } from "../lib/providers/Toast";
import { Toast } from "../lib/providers/ToastView";
import { matchesShortcut } from "../lib/registry/match";
import { getShortcut } from "../lib/registry/shortcuts";
import type { CommandContext } from "../lib/types/commands";
import type { AppMode } from "../lib/types/mode";
import { renderer } from "./renderer";

export function Shell() {
  const [mode, setMode] = useState<AppMode>("plan");
  const [promptValue, setPromptValue] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const [draftProvider, setDraftProvider] = useState<string>(DEFAULT_SESSION_PROVIDER);
  const [draftModel, setDraftModel] = useState<string>(DEFAULT_SESSION_MODEL);
  const { show } = useToast();
  const { user, logout } = useAuth();
  const dialog = useDialog();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher({ key: CHAT_FETCHER_KEY });
  const revalidator = useRevalidator();
  const { bridge, state: linkState, status } = useWorkspaceConnection();
  const matches = useMatches();
  const sessionId = matches.find((match) => match.id === "session")?.params.id;
  const session = useRouteLoaderData("session") as Session | undefined;
  const busy = navigation.state !== "idle" || fetcher.state !== "idle";
  const streamPhase =
    sessionId && linkState.generateStream?.sessionId === sessionId
      ? linkState.generateStream.phase
      : null;

  useEffect(() => {
    if (!busy) {
      bridge.clearGenerateStream();
    }
  }, [busy, bridge]);

  useEffect(() => {
    if (session) {
      setDraftProvider(session.provider);
      setDraftModel(session.model);
    }
  }, [session?.id, session?.provider, session?.model]);

  useEffect(() => {
    if (linkState.chatSessionId && !sessionId && navigation.state === "idle") {
      const path = matches[0]?.pathname ?? "";
      if (path === "/" || path.endsWith("/session/new")) {
        navigate(`/session/${linkState.chatSessionId}`, { replace: true });
      }
    }
  }, [linkState.chatSessionId, sessionId, navigate, matches, navigation.state]);

  useEffect(() => {
    return bridge.onSessionMessages((id) => {
      if (id === sessionId) {
        void revalidator.revalidate();
      }
    });
  }, [bridge, sessionId, revalidator]);

  const commandContext = useMemo<CommandContext>(
    () => ({
      exit: () => {
        renderer.destroy();
      },
      newSession: () => {
        void (async () => {
          try {
            const created = await bridge.createSession();
            navigate(`/session/${created.id}`);
            show("Conversación reiniciada", "success");
          } catch (err) {
            show(err instanceof Error ? err.message : "No se pudo crear", "error");
          }
        })();
      },
      logout,
      toast: show,
      dialog: { open: dialog.open, close: dialog.close },
    }),
    [show, dialog.open, dialog.close, navigate, logout, bridge],
  );

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("toggle-status-panel"))) {
      key.preventDefault();
      setStatusPanelOpen((prev) => !prev);
      return;
    }
    if (statusPanelOpen && matchesShortcut(key, getShortcut("focus-prompt"))) {
      key.preventDefault();
      setStatusPanelOpen(false);
      return;
    }
    if (matchesShortcut(key, getShortcut("cycle-model"))) {
      key.preventDefault();
      const next = nextSelectableChatModel(draftProvider, draftModel);
      setDraftProvider(next.provider);
      setDraftModel(next.id);
      return;
    }
    if (matchesShortcut(key, getShortcut("toggle-mode"))) {
      key.preventDefault();
      setMode((prev) => (prev === "plan" ? "build" : "plan"));
    }
  });

  const handleSend = (text: string) => {
    const body = new FormData();
    body.set("text", text);
    body.set("mode", mode);
    body.set("model", draftModel);
    body.set("provider", draftProvider);
    if (sessionId) {
      void fetcher.submit(body, { method: "post", action: `/session/${sessionId}` });
      return;
    }
    void submit(body, { method: "post", action: "/session/new" });
  };

  const messageCount = session?.turns.filter((turn) => turn.role === "user").length ?? 0;
  const sessionLabel = sessionId ? shortSessionId(sessionId) : "nueva";

  return (
    <box flexDirection="column" flexGrow={1}>
      <StatusBar
        messageCount={messageCount}
        sessionLabel={sessionLabel}
        linkStatus={status}
        workspacePath={linkState.path}
        open={statusPanelOpen}
        onToggle={() => setStatusPanelOpen((prev) => !prev)}
      />
      {statusPanelOpen ? (
        <StatusInfoPanel
          user={user}
          workspacePath={linkState.path}
          linkStatus={status}
          sessionLabel={sessionLabel}
          messageCount={messageCount}
        />
      ) : null}
      <box flexDirection="column" flexGrow={1} border borderColor="#414868">
        <Outlet />
        {dialog.current === "models" ? (
          <ModelsDialog
            currentProvider={draftProvider}
            currentModel={draftModel}
            onClose={dialog.close}
            onSelect={({ provider, model }) => {
              setDraftProvider(provider);
              setDraftModel(model);
              dialog.close();
            }}
            onUnsupported={(provider) => {
              show(`Provider ${provider} aún no implementado`, "error");
            }}
          />
        ) : null}
        {dialog.current === "sessions" ? (
          <SessionsDialog
            currentSessionId={sessionId}
            onClose={dialog.close}
            onSelect={(id) => {
              dialog.close();
              navigate(`/session/${id}`);
            }}
          />
        ) : null}
        {dialog.current === "connect" ? (
          <ConnectDialog
            onClose={dialog.close}
            onSuccess={(message) => {
              show(message, "success");
              void (async () => {
                try {
                  const created = await bridge.createSession({
                    provider: DEFAULT_SESSION_PROVIDER,
                    model: DEFAULT_SESSION_MODEL,
                  });
                  navigate(`/session/${created.id}`);
                } catch (err) {
                  show(
                    err instanceof Error ? err.message : "No se pudo abrir sesión Cursor",
                    "error",
                  );
                }
              })();
            }}
            onError={(message) => show(message, "error")}
          />
        ) : null}
        <CommandMenu query={promptValue} selectedIndex={selectedCommandIndex} />
        <Toast />
        <Prompt
          busy={busy}
          commandContext={commandContext}
          focused={dialog.current == null}
          selectedCommandIndex={selectedCommandIndex}
          onSelectedCommandIndexChange={setSelectedCommandIndex}
          onValueChange={setPromptValue}
          onSend={handleSend}
        />
        <SessionFooter
          busy={busy}
          model={draftModel}
          provider={draftProvider}
          mode={mode}
          streamPhase={streamPhase}
          onOpenModels={() => dialog.open("models")}
        />
      </box>
    </box>
  );
}

export function ShellFallback() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <StatusBar sessionLabel="nueva" linkStatus="disconnected" />
      <box flexDirection="column" flexGrow={1} border borderColor="#414868">
        <MessageList turns={[]} />
        <SessionFooter
          busy={false}
          model={DEFAULT_SESSION_MODEL}
          provider={DEFAULT_SESSION_PROVIDER}
          mode="plan"
        />
      </box>
    </box>
  );
}
