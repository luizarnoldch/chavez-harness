// auth.repository.ts
import { eq } from "drizzle-orm";
import { user } from "@/db/auth/auth-schema";
import db from "@/lib/db";
import { AuthUser } from "../schemas/auth.schema";

export const findById = async (id: string): Promise<AuthUser | null> => {
  const result = await db.select().from(user).where(eq(user.id, id));
  return result[0] ?? null;
};

export const findByEmail = async (email: string): Promise<AuthUser | null> => {
  const result = await db.select().from(user).where(eq(user.email, email));
  return result[0] ?? null;
};

export const findByName = async (name: string): Promise<AuthUser | null> => {
  const result = await db.select().from(user).where(eq(user.name, name));
  return result[0] ?? null;
};
