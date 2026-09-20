import type { ConnectableProvider, ProviderCredentialStatus } from "@chavez-harness/shared";
import { apiFetch } from "../auth/api/api.ts";

export async function listProviders(): Promise<ProviderCredentialStatus[]> {
  const response = await apiFetch("/api/providers");
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `No se pudo listar providers (${response.status})`);
  }
  const data = (await response.json()) as { providers: ProviderCredentialStatus[] };
  return data.providers;
}

export async function upsertProviderCredential(
  provider: ConnectableProvider,
  apiKey: string,
): Promise<ProviderCredentialStatus> {
  const response = await apiFetch(`/api/providers/${provider}/credentials`, {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `No se pudo guardar (${response.status})`);
  }
  return (await response.json()) as ProviderCredentialStatus;
}
