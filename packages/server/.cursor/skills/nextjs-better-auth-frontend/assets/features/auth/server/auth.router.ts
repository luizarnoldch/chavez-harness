// auth.router.ts
import { TRPCError } from "@trpc/server";
import {
	baseProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "@/trpc/init";
import {
	changePasswordSchema,
	requestPasswordResetSchema,
	resetPasswordSchema,
	signInSchema,
	signOutSchema,
	signUpSchema,
} from "../schemas/auth.schema";
import * as authService from "./auth.service";

export const authRouter = createTRPCRouter({
	signIn: baseProcedure.input(signInSchema).mutation(async ({ input }) => {
		try {
			return await authService.signIn(input);
		} catch (err) {
			if (err instanceof Error && err.message.includes("already exists")) {
				throw new TRPCError({ code: "CONFLICT", message: err.message });
			}
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: err instanceof Error ? err.message : "Invalid credentials",
			});
		}
	}),

	signUp: baseProcedure.input(signUpSchema).mutation(async ({ input }) => {
		try {
			return await authService.signUp(input);
		} catch (err) {
			if (err instanceof Error && err.message.includes("already exists")) {
				throw new TRPCError({ code: "CONFLICT", message: err.message });
			}
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: err instanceof Error ? err.message : "Failed to sign up",
			});
		}
	}),

	signOut: protectedProcedure.input(signOutSchema).mutation(async () => {
		try {
			return await authService.signOut();
		} catch (err) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: err instanceof Error ? err.message : "Failed to sign out",
			});
		}
	}),

	requestPasswordReset: baseProcedure
		.input(requestPasswordResetSchema)
		.mutation(async ({ input }) => {
			try {
				return await authService.requestPasswordReset(input);
			} catch (err) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						err instanceof Error
							? err.message
							: "Failed to request password reset",
				});
			}
		}),

	resetPassword: baseProcedure
		.input(resetPasswordSchema)
		.mutation(async ({ input }) => {
			try {
				return await authService.resetPassword(input);
			} catch (err) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						err instanceof Error ? err.message : "Failed to reset password",
				});
			}
		}),

	changePassword: protectedProcedure
		.input(changePasswordSchema)
		.mutation(async ({ input }) => {
			try {
				return await authService.changePassword(input);
			} catch (err) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						err instanceof Error ? err.message : "Failed to change password",
				});
			}
		}),
});