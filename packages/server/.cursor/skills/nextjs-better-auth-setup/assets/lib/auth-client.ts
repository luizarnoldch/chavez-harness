import { createAuthClient } from "better-auth/react";
import config from "./config";

const authClient = createAuthClient({
  baseURL: config.betterAuthUrl,
});

export default authClient;
