import type { ChatSessionDto } from "@chavez-harness/shared";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { matchesShortcut } from "../../../lib/registry/match";
import { getShortcut } from "../../../lib/registry/shortcuts";
import { useToast } from "../../../lib/providers/Toast";
import { shortSessionId } from "../../session/store";
import { useWorkspaceConnection } from "../../workspace/ui/WorkspaceConnection";

const MAX_VISIBLE = 8;

type SessionsDialogProps = {
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  /** Called after deleting the currently open session; pass next id or null. */
  onDeletedCurrent?: (nextSessionId: string | null) => void;
  currentSessionId?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sessions: ChatSessionDto[] };

function formatWhen(session: ChatSessionDto): string {
  const raw = session.lastMessageAt ?? session.createdAt;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
    return d.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return raw.slice(0, 10);
  }
}

function rowLabel(session: ChatSessionDto): string {
  const title = session.title?.trim() || "Sin título";
  return `${shortSessionId(session.id)} · ${title}`;
}

export function SessionsDialog({
  onClose,
  onSelect,
  onDeletedCurrent,
  currentSessionId,
}: SessionsDialogProps) {
  const { bridge } = useWorkspaceConnection();
  const { show } = useToast();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sessions = await bridge.listSessions();
        if (cancelled) return;
        setLoad({ status: "ready", sessions });
        const activeIdx = currentSessionId
          ? sessions.findIndex((s) => s.id === currentSessionId)
          : -1;
        setSelectedIndex(activeIdx >= 0 ? activeIdx : 0);
      } catch (err) {
        if (cancelled) return;
        setLoad({
          status: "error",
          message: err instanceof Error ? err.message : "Error al listar",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bridge, currentSessionId]);

  useKeyboard((key) => {
    if (matchesShortcut(key, getShortcut("focus-prompt")) || key.name === "escape") {
      key.preventDefault();
      onClose();
      return;
    }

    if (load.status !== "ready" || load.sessions.length === 0 || deleting) return;

    if (matchesShortcut(key, getShortcut("sessions-delete"))) {
      key.preventDefault();
      const session = load.sessions[selectedIndex];
      if (!session) return;
      setDeleting(true);
      void (async () => {
        try {
          await bridge.deleteSession(session.id);
          const remaining = load.sessions.filter((s) => s.id !== session.id);
          setLoad({ status: "ready", sessions: remaining });
          setSelectedIndex((i) => Math.min(i, Math.max(0, remaining.length - 1)));
          show("Sesión eliminada", "success");
          if (session.id === currentSessionId) {
            const next = remaining[0]?.id ?? null;
            onDeletedCurrent?.(next);
            if (!next) onClose();
          }
        } catch (err) {
          show(err instanceof Error ? err.message : "No se pudo eliminar", "error");
        } finally {
          setDeleting(false);
        }
      })();
      return;
    }

    if (key.name === "up" || key.name === "k") {
      key.preventDefault();
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.name === "down" || key.name === "j") {
      key.preventDefault();
      setSelectedIndex((i) => Math.min(load.sessions.length - 1, i + 1));
      return;
    }
    if (key.name === "return" || key.name === "kpenter") {
      key.preventDefault();
      const session = load.sessions[selectedIndex];
      if (session) onSelect(session.id);
    }
  });

  if (load.status === "loading") {
    return (
      <box border borderColor="#414868" title="Sesiones" paddingLeft={1} paddingRight={1} height={3}>
        <text fg="#888888">Cargando conversaciones…</text>
      </box>
    );
  }

  if (load.status === "error") {
    return (
      <box border borderColor="#f7768e" title="Sesiones" paddingLeft={1} paddingRight={1} height={3}>
        <text fg="#f7768e">{load.message}</text>
      </box>
    );
  }

  if (load.sessions.length === 0) {
    return (
      <box border borderColor="#414868" title="Sesiones · Ctrl+D borra" paddingLeft={1} paddingRight={1} height={3}>
        <text fg="#888888">
          {deleting ? "Eliminando…" : "No hay conversaciones en este workspace"}
        </text>
      </box>
    );
  }

  const visibleRows = Math.min(load.sessions.length, MAX_VISIBLE);
  const safeIndex = Math.min(selectedIndex, load.sessions.length - 1);

  return (
    <SessionsList
      sessions={load.sessions}
      safeIndex={safeIndex}
      visibleRows={visibleRows}
      currentSessionId={currentSessionId}
      deleting={deleting}
    />
  );
}

type SessionsListProps = {
  sessions: ChatSessionDto[];
  safeIndex: number;
  visibleRows: number;
  currentSessionId?: string;
  deleting: boolean;
};

function SessionsList({
  sessions,
  safeIndex,
  visibleRows,
  currentSessionId,
  deleting,
}: SessionsListProps) {
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useEffect(() => {
    scrollRef.current?.scrollChildIntoView(`sess-${safeIndex}`);
  }, [safeIndex]);

  return (
    <box
      border
      borderColor="#7aa2f7"
      title={deleting ? "Sesiones · eliminando…" : "Sesiones · Ctrl+D borra"}
      height={visibleRows + 2}
    >
      <scrollbox ref={scrollRef} height={visibleRows} flexGrow={1}>
        {sessions.map((session, index) => {
          const selected = index === safeIndex;
          const active = session.id === currentSessionId;
          return (
            <box
              key={session.id}
              id={`sess-${index}`}
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selected ? "#334455" : undefined}
              flexDirection="row"
            >
              <text fg={selected ? "#FFFF00" : "#FFFFFF"}>
                {active ? "● " : "  "}
                {rowLabel(session)}
              </text>
              <text attributes={TextAttributes.DIM}> · {formatWhen(session)}</text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
