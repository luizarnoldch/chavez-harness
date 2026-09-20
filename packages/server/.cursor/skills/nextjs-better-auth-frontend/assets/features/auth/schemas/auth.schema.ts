import z from "zod";
import { createSelectSchema } from "drizzle-orm/zod";
import { user } from "@/db/schema";

export const userSchema = createSelectSchema(user);
export type AuthUser = z.infer<typeof userSchema>;

export const signInSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  image: z.instanceof(File).optional().nullable(),
  rememberMe: z.boolean(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signOutSchema = z.object({});
export type SignOutInput = z.infer<typeof signOutSchema>;

export const requestPasswordResetSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  redirectTo: z.url().optional(),
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "Current password is required" }),
  newPassword: z
    .string()
    .min(8, { message: "New password must be at least 8 characters" }),
  revokeOtherSessions: z.boolean().optional(),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
