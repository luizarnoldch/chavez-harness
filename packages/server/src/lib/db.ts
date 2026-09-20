import "dotenv/config";
import { authRelations } from "@/db/auth/auth-schema";
import { chatRelations } from "@/db/chat/schema";
import { providerRelations } from "@/db/providers/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

const db = drizzle({
  client: pool,
  relations: {
    ...authRelations,
    ...chatRelations,
    ...providerRelations,
  },
});

export default db;
export type Db = typeof db;
