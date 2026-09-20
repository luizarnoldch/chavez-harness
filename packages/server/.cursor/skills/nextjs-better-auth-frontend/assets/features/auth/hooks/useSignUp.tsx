"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { signUpSchema } from "../schemas/auth.schema";
import type { SignUpInput } from "../schemas/auth.schema";

type UseSignUpProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

const useSignUp = ({ onSuccess, onError }: UseSignUpProps = {}) => {
  const trpc = useTRPC();

  const mutation = useMutation({
    ...trpc.auth.signUp.mutationOptions(),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      image: null,
      rememberMe: false,
    } as SignUpInput,
    validators: {
      onChange: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
    },
  });

  return {
    form,
    ...mutation,
  };
};

export default useSignUp;
