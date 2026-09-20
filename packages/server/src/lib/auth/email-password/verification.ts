import type { betterAuth } from "better-auth";
import config from "@/lib/config";

/**
 * Configuration for email verification logic.
 */
export const emailVerificationOptions: Parameters<
  typeof betterAuth
>[0]["emailVerification"] = {
  autoSignInAfterVerification: false,
  expiresIn: 60 * 60 * 24,

  sendOnSignUp: true, // If requireEmailVerification is true, this might be true
  sendOnSignIn: false, // If requireEmailVerification is true, this might be true
  /**
   * Function used to send the verification email.
   */
  sendVerificationEmail: async ({ user, url, token }) => {
    // Default verification flow
    // TODO: Implement email sending logic here. You can use any email service (like SendGrid, SES, etc.) to send the verification email.
    // await sendVerificationEmail({
    //   user: {
    //     ...user,
    //     image: user.image ?? null,
    //   },
    //   url,
    //   token,
    // });
    /*
    // CUSTOMIZATION EXAMPLE:
    // You can change the verification URL or add custom parameters if you have a custom verify page.
    const customUrl = `${config.serverUrl}/auth/verify-email?token=${token}&email=${user.email}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your account",
      html: `<p>Please verify your account by clicking <a href="${customUrl}">here</a>.</p>`
    });
    */
  },

  beforeEmailVerification: async (user) => {
    console.log(
      `[auth/email-auth.ts] Email verification for user: ${user.email}`,
    );
    // TODO: Implement email verification notification
    // console.log(`Email for user ${user.email} has been verified.`);
  },

  afterEmailVerification: async (user) => {
    console.log(
      `[auth/email-auth.ts] Email verification for user: ${user.email}`,
    );
    // TODO: Implement email verification notification
    // console.log(`Email for user ${user.email} has been verified.`);
  },
};
