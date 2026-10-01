"use client";

import { useEffect, useState } from "react";
import type { ProviderCredentialStatus } from "@chavez-harness/shared";
import { KeyRound } from "lucide-react";
import { Section } from "@/components/common/Section";
import { StatusPill } from "@/components/common/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import { listProviderCredentials } from "@/lib/api";

/** Is the Cursor credential configured? Agents in Build/Plan need it. */
export function ProvidersCard() {
  const [providers, setProviders] = useState<ProviderCredentialStatus[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listProviderCredentials()
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cursor = providers?.find((p) => p.provider === "cursor");
  const connected = providers?.filter((p) => p.configured).length ?? 0;

  return (
    <Section
      title="Proveedores"
      action={
        <a href="/arsenal/providers" className="text-xs font-semibold text-primary-strong hover:underline">
          Gestionar
        </a>
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong">
          <KeyRound className="size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">Cursor</span>
          <span className="truncate text-xs text-faint">
            {failed
              ? "No se pudo consultar el estado"
              : cursor?.configured
                ? "API key guardada: los agentes pueden correr en tu PC"
                : providers
                  ? "Falta la API key: conéctala para usar el agente"
                  : "Consultando…"}
          </span>
        </div>
        {providers === null && !failed ? (
          <Skeleton className="h-5 w-20 rounded-full" />
        ) : failed ? (
          <StatusPill tone="blocked">Sin datos</StatusPill>
        ) : cursor?.configured ? (
          <StatusPill tone="done">Conectado</StatusPill>
        ) : (
          <StatusPill tone="progress">Sin conectar</StatusPill>
        )}
      </div>
      {providers ? (
        <p className="px-1 text-[11px] text-faint">
          {connected} de {providers.length} proveedores conectados.
        </p>
      ) : null}
    </Section>
  );
}
