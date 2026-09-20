import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import db from "../db";
import { hooksOptions } from "./hooks/createMiddleware";
import { emailAndPasswordOptions } from "./email-password/email";
import { emailVerificationOptions } from "./email-password/verification";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  emailAndPassword: emailAndPasswordOptions,
  emailVerification: emailVerificationOptions,
  plugins: [nextCookies()],
  hooks: hooksOptions,
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
