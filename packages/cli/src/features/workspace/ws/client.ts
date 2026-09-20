import type { WsReply } from "@chavez-harness/shared";
import { createBackoff } from "./reconnect.ts";

export type PushHandler = (message: Record<string, unknown>) => void;

export type ChavezWsClientOptions = {
  apiUrl: string;
  token: string;
  onPush?: PushHandler;
  autoReconnect?: boolean;
};

function toWsUrl(apiUrl: string, token: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

type Pending = {
  resolve: (reply: WsReply) => void;
  reject: (error: Error) => void;
};

export class ChavezWsClient {
  private socket: WebSocket | null = null;
  private readonly pending = new Map<string, Pending>();
  private readonly backoff = createBackoff();
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: ChavezWsClientOptions) {}

  connect(): Promise<void> {
    this.closedByUser = false;
    return this.openSocket();
  }

  private openSocket(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    const url = toWsUrl(this.options.apiUrl, this.options.token);
    const socket = new WebSocket(url);
    this.socket = socket;

    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.backoff.reset();
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("WebSocket connection failed"));
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

    if (typeof msg.id === "string") {
      const entry = this.pending.get(msg.id);
      if (entry) {
        this.pending.delete(msg.id);
        entry.resolve(msg as unknown as WsReply);
      }
    }
  }

  private onClose() {
    for (const [id, entry] of this.pending) {
      entry.reject(new Error("WebSocket closed"));
      this.pending.delete(id);
    }

    if (this.closedByUser || this.options.autoReconnect === false) return;

    const delay = this.backoff.nextDelayMs();
    this.reconnectTimer = setTimeout(() => {
      void this.openSocket().catch(() => {
        // next close will schedule again
      });
    }, delay);
  }

  async request<T = unknown>(
    message: Record<string, unknown> & { id: string; type: string },
  ): Promise<WsReply & { data?: T }> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const reply = await new Promise<WsReply>((resolve, reject) => {
      this.pending.set(message.id, { resolve, reject });
      socket.send(JSON.stringify(message));
    });

    return reply as WsReply & { data?: T };
  }

  send(message: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.socket.send(JSON.stringify(message));
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}
