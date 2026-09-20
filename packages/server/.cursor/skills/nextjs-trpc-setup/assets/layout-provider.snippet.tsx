import { TRPCReactProvider } from "@/trpc/client";

// Wrap children (idempotent patch target):
<TRPCReactProvider>{children}</TRPCReactProvider>
