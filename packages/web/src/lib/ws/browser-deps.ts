import { ensureSessionToken } from "../session-token";
import { ChavezWsClient } from "../ws-client";
import type { SharedSocketDeps } from "./shared-socket";

/** Real client + token provider for the browser (tests inject fakes instead). */
export const browserDeps: SharedSocketDeps = {
  createClient: (options) => new ChavezWsClient(options),
  ensureToken: ensureSessionToken,
};
