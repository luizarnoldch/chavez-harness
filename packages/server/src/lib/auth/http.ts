import type { Context, Next } from "hono";
import { auth } from "./index.ts";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthVariables = {
  user: AuthUser;
};

export async function requireAuth(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  await next();
}
