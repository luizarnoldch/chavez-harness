import { useFetcher, useLoaderData, useNavigation } from "react-router";
import type { Session, Turn } from "../../session/store";
import { useWorkspaceConnection } from "../../workspace/ui/WorkspaceConnection";
import { MessageList, type PendingTurn } from "./MessageList";

export const CHAT_FETCHER_KEY = "chat-send";

export function ChatPane() {
  const session = useLoaderData() as Session | null;
  const navigation = useNavigation();
  const fetcher = useFetcher({ key: CHAT_FETCHER_KEY });
  const { state: linkState } = useWorkspaceConnection();
  const formData =
    navigation.state !== "idle"
      ? navigation.formData
      : fetcher.state !== "idle"
        ? fetcher.formData
        : undefined;

  const stream =
    session?.id && linkState.generateStream?.sessionId === session.id
      ? linkState.generateStream
      : null;

  const turns = session?.turns ?? [];

  return (
    <MessageList
      turns={turns}
      pending={resolvePendingTurn(formData, turns)}
      streamingDraft={stream?.draftText || null}
      streamingTools={stream?.draftTools ?? []}
    />
  );
}

/** Visible while the send action is in flight, unless turns already include that user message. */
export function resolvePendingTurn(
  formData: FormData | undefined,
  turns: Turn[],
): PendingTurn | null {
  if (!formData) return null;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return null;
  const mode = formData.get("mode") === "build" ? "build" : "plan";
  const clientMessageId = String(formData.get("clientMessageId") ?? "").trim();

  if (clientMessageId) {
    const matched = turns.some(
      (t) => t.role === "user" && t.clientMessageId === clientMessageId,
    );
    if (matched) return null;
  }

  const last = turns.at(-1);
  if (
    last?.role === "user" &&
    last.text === text &&
    last.mode === mode
  ) {
    return null;
  }

  return { text, mode };
}
