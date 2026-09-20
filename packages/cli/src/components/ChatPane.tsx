import { useFetcher, useLoaderData, useNavigation } from "react-router";
import type { Session } from "../session/store";
import { MessageList, type PendingTurn } from "./MessageList";

export const CHAT_FETCHER_KEY = "chat-send";

export function ChatPane() {
  const session = useLoaderData() as Session | null;
  const navigation = useNavigation();
  const fetcher = useFetcher({ key: CHAT_FETCHER_KEY });
  const formData =
    navigation.state !== "idle"
      ? navigation.formData
      : fetcher.state !== "idle"
        ? fetcher.formData
        : undefined;

  return <MessageList turns={session?.turns ?? []} pending={pendingTurn(formData)} />;
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
