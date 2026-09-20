import { useKeyboard } from "@opentui/react";
import { useMemo, useState } from "react";
import {
  Outlet,
  useFetcher,
  useMatches,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
  useSubmit,
} from "react-router";
import { matchesShortcut } from "../registry/match";
import { getShortcut } from "../registry/shortcuts";
import type { Session } from "../session/store";
import { shortSessionId } from "../session/store";
import type { CommandContext } from "../types/commands";
import { renderer } from "../renderer";
import { useDialog } from "../providers/Dialog";
import { useToast } from "../providers/Toast";
import { LOCAL_MODEL } from "../session/model";
import { CHAT_FETCHER_KEY } from "./ChatPane";
import { CommandMenu } from "./CommandMenu";
import { MessageList } from "./MessageList";
import { ModelsDialog } from "./ModelsDialog";
import { Prompt } from "./Prompt";
import { SessionFooter } from "./SessionFooter";
import { StatusBar, type AppMode } from "./StatusBar";
import { Toast } from "./Toast";

export function Shell() {
  const [mode, setMode] = useState<AppMode>("plan");
  const [promptValue, setPromptValue] = useState("");
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const { show } = useToast();
  const dialog = useDialog();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher({ key: CHAT_FETCHER_KEY });
  const matches = useMatches();
  const sessionId = matches.find((match) => match.id === "session")?.params.id;
  const session = useRouteLoaderData("session") as Session | undefined;
  const busy = navigation.state !== "idle" || fetcher.state !== "idle";

  const commandContext = useMemo<CommandContext>(
    () => ({
      exit: () => {
        renderer.destroy();
      },
      newSession: () => {
        navigate("/session/new");
      },
      toast: show,
      dialog: { open: dialog.open, close: dialog.close },
    }),
    [show, dialog.open, dialog.close, navigate],
  );

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("toggle-mode"))) {
      key.preventDefault();
      setMode((prev) => (prev === "plan" ? "build" : "plan"));
    }
  });

  const handleSend = (text: string) => {
    const body = new FormData();
    body.set("text", text);
    body.set("mode", mode);
    body.set("model", LOCAL_MODEL);
    if (sessionId) {
      void fetcher.submit(body, { method: "post", action: `/session/${sessionId}` });
      return;
    }
    void submit(body, { method: "post", action: "/session/new" });
  };

  const messageCount = session?.turns.filter((turn) => turn.role === "user").length ?? 0;

  return (
    <box flexDirection="column" flexGrow={1}>
      <StatusBar
        messageCount={messageCount}
        sessionLabel={sessionId ? shortSessionId(sessionId) : "nueva"}
      />
      <box flexDirection="column" flexGrow={1} border borderColor="#414868">
        <Outlet />
        {dialog.current === "models" ? <ModelsDialog onClose={dialog.close} /> : null}
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
        <SessionFooter busy={busy} model={LOCAL_MODEL} mode={mode} />
      </box>
    </box>
  );
}

export function ShellFallback() {
  return (
    <box flexDirection="column" flexGrow={1}>
      <StatusBar sessionLabel="nueva" />
      <box flexDirection="column" flexGrow={1} border borderColor="#414868">
        <MessageList turns={[]} />
        <SessionFooter busy={false} model={LOCAL_MODEL} mode="plan" />
      </box>
    </box>
  );
}
