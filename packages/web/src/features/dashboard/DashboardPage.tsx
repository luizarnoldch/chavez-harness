"use client";

import { useCallback, useMemo, useState } from "react";
import type { DashboardWorkspace } from "@chavez-harness/shared";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/common/Section";
import { AppShell, Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncBadge } from "@/features/chat/header/SyncBadge";
import { setWorkspaceDaemon } from "@/lib/api";
import { useNow } from "@/lib/use-now";
import { useUserActivity } from "@/lib/ws/useUserActivity";
import { ActivityFeed } from "./ActivityFeed";
import { LiveNowSection } from "./LiveNowSection";
import { ProvidersCard } from "./ProvidersCard";
import { RecentSessions } from "./RecentSessions";
import { StatRow } from "./StatRow";
import { WorkspaceGrid } from "./WorkspaceGrid";
import { generatingCountFor, generatingList, sortWorkspaces } from "./activity";

/**
 * Home: PC, workspaces, sessions in flight and a live activity feed. Everything comes
 * from the page's activity store (`GET /api/dashboard` + user-level socket pushes).
 */
export function DashboardPage() {
  const view = useUserActivity();
  const now = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);

  const workspaces = useMemo(() => sortWorkspaces(Object.values(view.workspaces)), [view.workspaces]);
  const workspacePaths = useMemo(
    () => Object.fromEntries(workspaces.map((w) => [w.id, w.path])),
    [workspaces],
  );
  const generating = useMemo(() => generatingList(view), [view.generating]);
  const generatingIds = useMemo(() => new Set(generating.map((g) => g.sessionId)), [generating]);
  const machineOnline = view.machineStatus === "online";
  const liveCount = workspaces.filter((w) => w.daemonStatus === "online").length;

  const toggleDaemon = useCallback(async (ws: DashboardWorkspace, desired: "on" | "off") => {
    setBusyId(ws.id);
    try {
      // The new state arrives through the pushes the server emits for this change.
      await setWorkspaceDaemon(ws.id, desired, "web");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al controlar el daemon");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <AppShell
      active="dashboard"
      title="Inicio"
      subtitle={<SyncBadge live={view.live} size="sm" />}
    >
      <Page className="max-w-[1080px]">
        {!view.loaded && view.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive-soft px-4 py-3 text-[13px]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span className="flex-1">{view.error}</span>
            <Button type="button" size="xs" variant="outline" onClick={() => void view.store?.refresh()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        <StatRow
          loaded={view.loaded}
          machine={view.machineStatus}
          workspacesLive={liveCount}
          workspacesTotal={workspaces.length}
          generating={generating.length}
          sessionsToday={view.sessionsToday}
        />

        <LiveNowSection
          generating={generating}
          sessions={view.recentSessions}
          workspacePaths={workspacePaths}
        />

        <Section
          title="Workspaces"
          action={
            <a href="/workspaces" className="text-xs font-semibold text-primary-strong hover:underline">
              Ver todos
            </a>
          }
        >
          {view.loaded ? (
            <WorkspaceGrid
              workspaces={workspaces}
              machineOnline={machineOnline}
              busyId={busyId}
              generatingFor={(id) => generatingCountFor(view, id)}
              onToggle={toggleDaemon}
              now={now}
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">
              <Skeleton className="h-[132px] w-full rounded-xl" />
              <Skeleton className="h-[132px] w-full rounded-xl" />
            </div>
          )}
        </Section>

        <div className="grid items-start gap-5 desk:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ActivityFeed entries={view.activity} workspacePaths={workspacePaths} now={now} />
          <div className="flex min-w-0 flex-col gap-5">
            <RecentSessions sessions={view.recentSessions} generatingIds={generatingIds} now={now} />
            <ProvidersCard />
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
