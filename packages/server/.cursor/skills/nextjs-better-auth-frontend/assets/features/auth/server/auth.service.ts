// auth.service.ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type {
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../schemas/auth.schema";
import * as authRepository from "./auth.repository";

export const signIn = async (data: SignInInput) => {
  return auth.api.signInEmail({
    body: {
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    },
    headers: await headers(),
  });
};

export const signUp = async (data: SignUpInput) => {
  const existing = await authRepository.findByEmail(data.email);
  if (existing) {
    throw new Error("User already exists");
  }

  return auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
      image: undefined,
      rememberMe: data.rememberMe,
    },
    headers: await headers(),
  });
};

export const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  return { success: true as const };
};

export const requestPasswordReset = async (data: RequestPasswordResetInput) => {
  await auth.api.requestPasswordReset({
    body: {
      email: data.email,
      redirectTo: data.redirectTo,
    },
    headers: await headers(),
  });
  return { success: true as const };
};

export const resetPassword = async (data: ResetPasswordInput) => {
  await auth.api.resetPassword({
    body: {
      token: data.token,
      newPassword: data.newPassword,
    },
    headers: await headers(),
  });
  return { success: true as const };
};

export const changePassword = async (data: ChangePasswordInput) => {
  await auth.api.changePassword({
    body: {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: data.revokeOtherSessions,
    },
    headers: await headers(),
  });
  return { success: true as const };
};
