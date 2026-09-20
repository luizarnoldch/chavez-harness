"use client";

import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

type UseSignOutProps = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

const useSignOut = ({ onSuccess, onError }: UseSignOutProps = {}) => {
  const trpc = useTRPC();

  const mutation = useMutation({
    ...trpc.auth.signOut.mutationOptions(),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  return {
    ...mutation,
  };
};

export default useSignOut;
