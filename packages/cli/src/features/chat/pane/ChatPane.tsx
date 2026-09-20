import { useFetcher, useLoaderData, useNavigation } from "react-router";
import type { Session } from "../../session/store";
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

  return (
    <MessageList
      turns={session?.turns ?? []}
      pending={pendingTurn(formData)}
      streamingDraft={stream?.draftText || null}
    />
  );
}

function pendingTurn(formData: FormData | undefined): PendingTurn | null {
  if (!formData) return null;
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return null;
  return {
    text,
    mode: formData.get("mode") === "build" ? "build" : "plan",
  };
}
