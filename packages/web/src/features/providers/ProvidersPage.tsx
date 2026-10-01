"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  SUPPORTED_CHAT_MODELS,
  type ConnectableProvider,
  type ProviderCredentialStatus,
} from "@chavez-harness/shared";
import { KeyRound, Lock, Plug } from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "@/components/common/StatusPill";
import { AppShell, Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { listProviderCredentials, upsertProviderCredential } from "@/lib/api";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

const PROVIDER_META: Record<string, { name: string; vendor: string }> = {
  cursor: { name: "Cursor", vendor: "Cursor SDK · agentes en tu máquina vía daemon" },
  openai: { name: "OpenAI", vendor: "GPT" },
  grok: { name: "xAI Grok", vendor: "Grok" },
  antropic: { name: "Anthropic", vendor: "Claude" },
  local: { name: "Local (eco)", vendor: "Mock integrado en el server" },
};

const MODEL_PREVIEW = 8;

function modelsFor(provider: string): string[] {
  const ids = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === provider).map((m) => m.id);
  return [...new Set<string>(ids)];
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderCredentialStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProviderCredentialStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setProviders(await listProviderCredentials());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setProviders((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connected = providers?.filter((p) => p.configured).length ?? 0;

  return (
    <AppShell
      active="arsenal:providers"
      title="Proveedores"
      subtitle="Backends LLM de tus sesiones"
      backHref="/arsenal"
    >
      <Page>
        <p className="text-sm text-muted-foreground">
          {providers
            ? `${connected} de ${providers.length} proveedores conectados. `
            : ""}
          Cada sesión guarda el modelo con el que corre; por ahora solo Cursor se puede conectar
          desde aquí.
        </p>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {providers === null ? (
            <>
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : (
            <>
              {providers.map((status) => (
                <ProviderCard key={status.provider} status={status} onConnect={() => setEditing(status)} />
              ))}
              <LocalProviderCard />
            </>
          )}
        </div>
      </Page>

      <CredentialSheet
        status={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={(saved) => {
          setProviders((prev) =>
            prev ? prev.map((p) => (p.provider === saved.provider ? saved : p)) : prev,
          );
          setEditing(null);
        }}
      />
    </AppShell>
  );
}

function ProviderMark({ name }: { name: string }) {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-heading font-bold">
      {name.charAt(0)}
    </span>
  );
}

function ModelChips({ provider }: { provider: string }) {
  const [expanded, setExpanded] = useState(false);
  const models = useMemo(() => modelsFor(provider), [provider]);
  if (models.length === 0) return null;
  const shown = expanded ? models : models.slice(0, MODEL_PREVIEW);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">
        {models.length} modelo{models.length === 1 ? "" : "s"}
      </span>
      <div className="flex flex-wrap gap-1">
        {shown.map((id) => (
          <span key={id} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {id}
          </span>
        ))}
        {models.length > MODEL_PREVIEW ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary"
          >
            {expanded ? "Ver menos" : `+${models.length - MODEL_PREVIEW} más`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProviderCard({ status, onConnect }: { status: ProviderCredentialStatus; onConnect: () => void }) {
  const meta = PROVIDER_META[status.provider] ?? { name: status.provider, vendor: "" };
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <header className="flex items-center gap-3">
        <ProviderMark name={meta.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-base">{meta.name}</h2>
          <span className="truncate text-xs text-faint">
            {meta.vendor}
            {status.configured && status.hint ? ` · API key ••••${status.hint}` : ""}
          </span>
        </div>
        {status.configured ? (
          <StatusPill tone="done">Conectado</StatusPill>
        ) : status.supported ? (
          <StatusPill tone="backlog">Sin configurar</StatusPill>
        ) : (
          <StatusPill tone="backlog">Aún no soportado</StatusPill>
        )}
      </header>

      {status.supported ? <ModelChips provider={status.provider} /> : null}

      {status.supported ? (
        <div className="flex flex-col items-start gap-2">
          {!status.configured ? (
            <p className="text-[13px] text-muted-foreground">
              Sin conectar: las sesiones con modelos de {meta.name} fallarán hasta que guardes una API
              key.
            </p>
          ) : null}
          <Button type="button" variant={status.configured ? "outline" : "default"} onClick={onConnect}>
            {status.configured ? <KeyRound /> : <Plug />}
            {status.configured ? "Actualizar API key" : "Conectar"}
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-faint">
          El generate de este proveedor todavía no está implementado en el daemon.
        </p>
      )}
    </article>
  );
}

function LocalProviderCard() {
  const meta = PROVIDER_META.local!;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <header className="flex items-center gap-3">
        <ProviderMark name={meta.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-base">{meta.name}</h2>
          <span className="truncate text-xs text-faint">{meta.vendor}</span>
        </div>
        <StatusPill tone="accent">Integrado</StatusPill>
      </header>
      <p className="text-[13px] text-muted-foreground">
        Responde en eco sin daemon ni credenciales: útil para probar la sincronización web ↔ TUI.
      </p>
    </article>
  );
}

type CredentialSheetProps = {
  status: ProviderCredentialStatus | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (status: ProviderCredentialStatus) => void;
};

function CredentialSheet({ status, onOpenChange, onSaved }: CredentialSheetProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const meta = status ? (PROVIDER_META[status.provider] ?? { name: status.provider, vendor: "" }) : null;

  useEffect(() => {
    if (status) setApiKey("");
  }, [status]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!status) return;
    const value = apiKey.trim();
    if (!value) {
      toast.error("Pega una API key primero");
      return;
    }
    setSaving(true);
    try {
      const saved = await upsertProviderCredential(status.provider as ConnectableProvider, value);
      toast.success(`${meta?.name ?? status.provider} conectado`);
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la credencial");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={status !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={desktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl"}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-heading text-lg font-bold">
            {status?.configured ? "Actualizar" : "Conectar"} {meta?.name}
          </SheetTitle>
          <SheetDescription>API key de tu cuenta de {meta?.name}.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-key">API key</Label>
            <Input
              id="provider-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={status?.hint ? `••••${status.hint}` : "key_…"}
              className="h-10 font-mono text-base sm:text-sm"
              autoFocus
            />
            <span className="flex items-start gap-1.5 text-xs text-faint">
              <Lock className="mt-0.5 size-3 shrink-0" />
              Se guarda cifrada en el servidor. El daemon la recibe con un job de un solo uso; nunca
              se escribe en la carpeta del workspace.
            </span>
          </div>
          <Button type="submit" size="lg" className="mt-auto h-11 w-full text-base" disabled={saving}>
            <Plug />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
