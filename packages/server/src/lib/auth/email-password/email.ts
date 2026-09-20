import type { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "./password";

/**
 * Configuration for email and password authentication.
 */
export const emailAndPasswordOptions: Parameters<
  typeof betterAuth
>[0]["emailAndPassword"] = {
  enabled: true,
  requireEmailVerification: false, // Set to true to force verification before login
  autoSignIn: true,

  password: {
    hash: async (password) => await hashPassword(password),
    verify: async ({ hash, password }) =>
      await verifyPassword({ hash, password }),
  },

  minPasswordLength: 8,
  maxPasswordLength: 128,
  revokeSessionsOnPasswordReset: true,
  resetPasswordTokenExpiresIn: 60 * 60 * 24,
  disableSignUp: false,

  customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
    ...coreFields,
    ...additionalFields,
    id,
  }),

  /**
   * Callback triggered when someone tries to sign up with an email that already exists.
   * This is only called when enumeration protection is active (requireEmailVerification: true or autoSignIn: false).
   */
  onExistingUserSignUp: async ({ user }, _request) => {
    // Possible actions here:
    // 1. Send a "Security Alert" email to the existing user.
    // 2. Log the attempt for security auditing.
    // 3. Trigger a password reset flow if the user forgot they had an account.

    console.log(
      `[auth/email-auth.ts] Sign-up attempt with existing email: ${user.email}`,
    );

    /* Example: Notify the user
    await sendSecurityAlertEmail({
      to: user.email,
      message: "Someone tried to create an account with your email. If this wasn't you, please secure your account."
    });
    */
  },

  /**
   * Callback triggered when a password reset email is sent.
   */
  sendResetPassword: async ({ user }) => {
    console.log(
      `[auth/email-auth.ts] Password reset email sent to: ${user.email}`,
    );
    // TODO: Implement password reset email sending
  },

  /**
   * Callback triggered when a password is reset.
   */
  onPasswordReset: async ({ user }) => {
    console.log(`[auth/email-auth.ts] Password reset for user: ${user.email}`);
    // TODO: Implement password reset notification
    // console.log(`Password for user ${user.email} has been reset.`);
  },
};
