"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { signInSchema } from "../schemas/auth.schema";
import type { SignInInput } from "../schemas/auth.schema";

type UseSignInProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

const useSignIn = ({ onSuccess, onError }: UseSignInProps = {}) => {
  const trpc = useTRPC();

  const mutation = useMutation({
    ...trpc.auth.signIn.mutationOptions(),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    } as SignInInput,
    validators: {
      onChange: signInSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return {
    form,
    ...mutation,
  };
};

export default useSignIn;
