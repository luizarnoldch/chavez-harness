import type { WsReply } from "@chavez-harness/shared";
import { getApiUrl } from "./env";
import { readSessionToken } from "./session-token";

export type PushHandler = (message: Record<string, unknown>) => void;

function toWsUrl(): string {
  const base =
    getApiUrl() ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:4321");
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  const token = readSessionToken();
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

type Pending = {
  resolve: (reply: WsReply) => void;
  reject: (error: Error) => void;
};

/** Browser WS client — same-origin /ws (proxied) + optional ?token=. */
export class ChavezWsClient {
  private socket: WebSocket | null = null;
  private readonly pending = new Map<string, Pending>();
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;

  constructor(
    private readonly options: {
      onPush?: PushHandler;
      autoReconnect?: boolean;
    } = {},
  ) {}

  connect(): Promise<void> {
    this.closedByUser = false;
    return this.openSocket();
  }

  private openSocket(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    const socket = new WebSocket(toWsUrl());
    this.socket = socket;

    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.attempt = 0;
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("No se pudo conectar al WebSocket"));
      };
      const cleanup = () => {
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("error", onError);
      };
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
      socket.addEventListener("message", (event) => this.onMessage(String(event.data)));
      socket.addEventListener("close", () => this.onClose());
    });
  }

  private onMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    if (msg.push === true) {
      this.options.onPush?.(msg);
      return;
    }

    const id = typeof msg.id === "string" ? msg.id : null;
    if (!id) return;
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    pending.resolve(msg as WsReply);
  }

  private onClose() {
    for (const [, pending] of this.pending) {
      pending.reject(new Error("WebSocket cerrado"));
    }
    this.pending.clear();
    this.socket = null;

    if (this.closedByUser || this.options.autoReconnect === false) return;
    const delay = Math.min(1000 * 2 ** this.attempt, 15000);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      void this.openSocket().catch(() => undefined);
    }, delay);
  }

  request<T = unknown>(
    type: string,
    payload: Record<string, unknown> = {},
  ): Promise<T> {
    const id = crypto.randomUUID();
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket no conectado"));
    }

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (reply) => {
          if (!reply.ok) {
            reject(new Error(reply.error ?? "Error de WebSocket"));
            return;
          }
          resolve(reply.data as T);
        },
        reject,
      });
      socket.send(JSON.stringify({ id, type, ...payload }));
    });
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }
}
