import { Hono } from "hono";
import { auth } from "../lib/auth/index.ts";

export const authRoutes = new Hono();

authRoutes.all("/api/auth/*", (c) => auth.handler(c.req.raw));
