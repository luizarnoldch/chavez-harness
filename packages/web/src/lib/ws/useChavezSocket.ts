"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { browserDeps } from "./browser-deps";
import {
  acquireSharedSocket,
  type PushListener,
  type SharedSocket,
  type SocketSnapshot,
} from "./shared-socket";

const IDLE: SocketSnapshot = { live: "connecting", error: null, sync: null, openCount: 0 };
const noopSubscribe = () => () => undefined;
const idleSnapshot = () => IDLE;

/**
 * The page's WebSocket, bound to its workspace (`clientLabel: "web"`) and subscribed to
 * the user's events. Several hooks (presence, chat, activity store) share a single
 * `ChavezWsClient`; it closes with the last one. Without a workspace there is no socket
 * here: the user-level one is owned by the activity store.
 */
export function useChavezSocket(
  workspaceId: string | null,
  path: string | null,
  options: { chatSessionId?: string | null } = {},
): SocketSnapshot & { socket: SharedSocket | null } {
  const [socket, setSocket] = useState<SharedSocket | null>(null);
  const chatSessionId = options.chatSessionId ?? null;

  useEffect(() => {
    if (!workspaceId || !path) {
      setSocket(null);
      return;
    }
    const acquired = acquireSharedSocket({ workspaceId, path, chatSessionId }, browserDeps);
    setSocket(acquired.socket);
    return () => {
      acquired.release();
    };
  }, [workspaceId, path, chatSessionId]);

  const snapshot = useSyncExternalStore(
    socket ? socket.subscribeState : noopSubscribe,
    socket ? socket.getSnapshot : idleSnapshot,
    idleSnapshot,
  );

  return { ...snapshot, socket };
}

/** Subscribe to pushes by type on a shared socket; the handler may change freely. */
export function useSocketPush(
  socket: SharedSocket | null,
  types: readonly string[],
  handler: PushListener,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const typesKey = types.join("|");

  useEffect(() => {
    if (!socket) return;
    const unsubscribers = typesKey
      .split("|")
      .filter(Boolean)
      .map((type) => socket.on(type, (message) => handlerRef.current(message)));
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [socket, typesKey]);
}
