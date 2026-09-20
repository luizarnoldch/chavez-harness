import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
  hooks: hooksOptions,
  plugins: [bearer()],
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
