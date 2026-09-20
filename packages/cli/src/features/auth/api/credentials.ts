import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type Credentials = {
  apiUrl: string;
  sessionToken: string;
  email?: string;
};

export function defaultApiUrl(): string {
  return process.env.CHAVEZ_API_URL ?? "http://localhost:28001";
}

export function credentialsPath(): string {
  if (process.env.CHAVEZ_CREDENTIALS_PATH) {
    return process.env.CHAVEZ_CREDENTIALS_PATH;
  }
  return join(homedir(), ".config", "chavez", "credentials.json");
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(credentialsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (!parsed.sessionToken || typeof parsed.sessionToken !== "string") return null;
    return {
      apiUrl: typeof parsed.apiUrl === "string" ? parsed.apiUrl : defaultApiUrl(),
      sessionToken: parsed.sessionToken,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveCredentials(credentials: Credentials): Promise<void> {
  const path = credentialsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
}

export async function clearCredentials(): Promise<void> {
  try {
    await unlink(credentialsPath());
  } catch {
    // ignore missing file
  }
}
