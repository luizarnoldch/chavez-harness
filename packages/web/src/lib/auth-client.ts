import { createAuthClient } from "better-auth/react";
import { getApiUrl } from "./env";

export const authClient = createAuthClient({
  /** Same-origin via Astro proxy; optional PUBLIC_API_URL bypass. */
  baseURL: getApiUrl() || undefined,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
