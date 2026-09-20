import { defineRelations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "../auth/auth-schema.ts";

export const userProviderCredential = pgTable(
  "user_provider_credential",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    ciphertext: text("ciphertext").notNull(),
    nonce: text("nonce").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    hint: text("hint").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_provider_credential_user_provider_uidx").on(
      table.userId,
      table.provider,
    ),
    index("user_provider_credential_userId_idx").on(table.userId),
  ],
);

export const providerRelations = defineRelations(
  { user, userProviderCredential },
  (r) => ({
    user: {
      providerCredentials: r.many.userProviderCredential(),
    },
    userProviderCredential: {
      user: r.one.user({
        from: r.userProviderCredential.userId,
        to: r.user.id,
      }),
    },
  }),
);
