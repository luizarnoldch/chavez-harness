import { TextAttributes } from "@opentui/core";
import type { AppMode } from "./StatusBar";
import type { Turn } from "../session/store";

export type PendingTurn = {
  text: string;
  mode: AppMode;
};

type MessageListProps = {
  turns: Turn[];
  pending?: PendingTurn | null;
};

const ERROR_COLOR = "#f7768e";

export function MessageList({ turns, pending = null }: MessageListProps) {
  const empty = turns.length === 0 && pending == null;

  return (
    <scrollbox flexGrow={1} stickyScroll stickyStart="bottom">
      {empty ? (
        <box padding={1}>
          <text attributes={TextAttributes.DIM}>Sin mensajes aún</text>
        </box>
      ) : (
        <>
          {turns.map((turn) =>
            turn.role === "user" ? (
              <UserMessage key={turn.id} mode={turn.mode} text={turn.text} />
            ) : turn.status === "error" ? (
              <ErrorMessage key={turn.id} turn={turn} />
            ) : (
              <BotMessage key={turn.id} turn={turn} />
            ),
          )}
          {pending ? <UserMessage mode={pending.mode} text={pending.text} /> : null}
        </>
      )}
    </scrollbox>
  );
}

function UserMessage({ mode, text }: { mode: AppMode; text: string }) {
  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1}>
      <text>
        <span attributes={TextAttributes.DIM}>[{mode}] </span>
        {text}
      </text>
    </box>
  );
}

function BotMessage({ turn }: { turn: Extract<Turn, { role: "assistant" }> }) {
  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1}>
      <text>
        {turn.text}
        <span attributes={TextAttributes.DIM}> {turn.model}</span>
      </text>
    </box>
  );
}

function ErrorMessage({ turn }: { turn: Extract<Turn, { role: "assistant" }> }) {
  return (
    <box paddingLeft={1} paddingRight={1} marginBottom={1}>
      <text>
        <span fg={ERROR_COLOR}>Error: {turn.error ?? "No se pudo obtener la respuesta"}</span>
        <span attributes={TextAttributes.DIM}> {turn.model}</span>
      </text>
    </box>
  );
}
