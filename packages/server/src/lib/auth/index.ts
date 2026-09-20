import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema";
import config from "../config";
import db from "../db";
import { hooksOptions } from "./hooks/createMiddleware";
import { emailAndPasswordOptions } from "./email-password/email";
import { emailVerificationOptions } from "./email-password/verification";

const secureCookies = config.webUrl.startsWith("https://");

export const auth = betterAuth({
  /** Public browser origin (Astro proxy). CLI uses Bearer against SERVER_URL. */
  baseURL: config.webUrl,
  secret: config.betterAuthSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: emailAndPasswordOptions,
  emailVerification: emailVerificationOptions,
  hooks: hooksOptions,
  plugins: [bearer()],
  trustedOrigins: [config.webUrl],
  advanced: {
    useSecureCookies: secureCookies,
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      secure: secureCookies,
    },
    database: {
      generateId: "uuid",
    },
  },
});
