export type ModelPricing = {
  inputUsdPermillionTokens: number;
  outputUsdPermillionTokens: number;
}

export type SupportedProvider = "antropic" | "cursor" | "openai" | "deepseek" | "grok" | "local";

/** Providers the CLI /connect flow may offer (local is built-in mock). */
export const CONNECTABLE_PROVIDERS = [
  "cursor",
  "openai",
  "grok",
  "antropic",
] as const satisfies readonly SupportedProvider[];

export type ConnectableProvider = (typeof CONNECTABLE_PROVIDERS)[number];

export type ProviderCredentialStatus = {
  provider: ConnectableProvider;
  /** Implemented end-to-end in this release. */
  supported: boolean;
  configured: boolean;
  /** Last 4 chars of the API key when configured. */
  hint: string | null;
};

type SupportedChatModelDefinition = {
  id: string
  provider: SupportedProvider
  pricing: ModelPricing
}

export const SUPPORTED_CHAT_MODELS = [
  // Local mock (server echo)
  {
    id: "eco",
    provider: "local",
    pricing: {
      inputUsdPermillionTokens: 0,
      outputUsdPermillionTokens: 0,
    },
  },

  // Anthropic Models
  {
    id: "claude-haiku-5",
    provider: "antropic",
    pricing: {
      inputUsdPermillionTokens: 1,
      outputUsdPermillionTokens: 5,
    },
  },
  {
    id: "claude-sonnet-5",
    provider: "antropic",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "claude-opus-5",
    provider: "antropic",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-fable-5-1",
    provider: "antropic",
    pricing: {
      inputUsdPermillionTokens: 10,
      outputUsdPermillionTokens: 50,
    },
  },

  // Grok Models
  {
    id: "grok-4.5",
    provider: "grok",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 6,
    },
  },
  {
    id: "grok-4.6",
    provider: "grok",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 6,
    },
  },

  // Cursor First-Party Models
  {
    id: "auto",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 6,
    },
  },
  {
    id: "grok-4.6",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 6,
    },
  },
  {
    id: "grok-4.6-fast",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 4,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "grok-4.5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 6,
    },
  },
  {
    id: "grok-4.5-fast",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 4,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "composer-2.5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.5,
      outputUsdPermillionTokens: 2.5,
    },
  },
  {
    id: "composer-2.5-fast",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 3,
      outputUsdPermillionTokens: 15,
    },
  },

  // Cursor Third-Party Models (Other Models Pool)
  {
    id: "claude-4-sonnet",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 3,
      outputUsdPermillionTokens: 15,
    },
  },
  {
    id: "claude-4-sonnet-1m",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 6,
      outputUsdPermillionTokens: 22.5,
    },
  },
  {
    id: "claude-4.5-haiku",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1,
      outputUsdPermillionTokens: 5,
    },
  },
  {
    id: "claude-4.5-opus",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-4.5-sonnet",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 3,
      outputUsdPermillionTokens: 15,
    },
  },
  {
    id: "claude-4.6-opus",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-4.6-sonnet",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 3,
      outputUsdPermillionTokens: 15,
    },
  },
  {
    id: "claude-4.7-opus",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-fable-5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 10,
      outputUsdPermillionTokens: 50,
    },
  },
  {
    id: "claude-fable-5-1",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 10,
      outputUsdPermillionTokens: 50,
    },
  },
  {
    id: "claude-opus-4.7-fast",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 30,
      outputUsdPermillionTokens: 150,
    },
  },
  {
    id: "claude-opus-4.8",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-opus-5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 25,
    },
  },
  {
    id: "claude-sonnet-5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "gemini-2.5-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.3,
      outputUsdPermillionTokens: 2.5,
    },
  },
  {
    id: "gemini-3-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.5,
      outputUsdPermillionTokens: 3,
    },
  },
  {
    id: "gemini-3-pro",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "gemini-3-pro-image-preview",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "gemini-3.1-pro",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "gemini-3.5-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.5,
      outputUsdPermillionTokens: 9,
    },
  },
  {
    id: "gemini-3.6-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.5,
      outputUsdPermillionTokens: 7.5,
    },
  },
  {
    id: "gemini-3.7-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.75,
      outputUsdPermillionTokens: 3.5,
    },
  },
  {
    id: "gemini-3.8-flash",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.75,
      outputUsdPermillionTokens: 3.5,
    },
  },
  {
    id: "glm-5.2",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.4,
      outputUsdPermillionTokens: 4.4,
    },
  },
  {
    id: "gpt-5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "gpt-5-fast",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2.5,
      outputUsdPermillionTokens: 20,
    },
  },
  {
    id: "gpt-5-mini",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.25,
      outputUsdPermillionTokens: 2,
    },
  },
  {
    id: "gpt-5-codex",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "gpt-5.1-codex",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "gpt-5.1-codex-max",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 10,
    },
  },
  {
    id: "gpt-5.1-codex-mini",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.25,
      outputUsdPermillionTokens: 2,
    },
  },
  {
    id: "gpt-5.2",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.75,
      outputUsdPermillionTokens: 14,
    },
  },
  {
    id: "gpt-5.2-codex",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.75,
      outputUsdPermillionTokens: 14,
    },
  },
  {
    id: "gpt-5.3-codex",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.75,
      outputUsdPermillionTokens: 14,
    },
  },
  {
    id: "gpt-5.4",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2.5,
      outputUsdPermillionTokens: 15,
    },
  },
  {
    id: "gpt-5.4-mini",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.75,
      outputUsdPermillionTokens: 4.5,
    },
  },
  {
    id: "gpt-5.4-nano",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.2,
      outputUsdPermillionTokens: 1.25,
    },
  },
  {
    id: "gpt-5.5",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 5,
      outputUsdPermillionTokens: 30,
    },
  },
  {
    id: "gpt-5.6-luna",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.2,
      outputUsdPermillionTokens: 1.2,
    },
  },
  {
    id: "gpt-5.6-sol",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 4,
      outputUsdPermillionTokens: 20,
    },
  },
  {
    id: "gpt-5.6-terra",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 2,
      outputUsdPermillionTokens: 12,
    },
  },
  {
    id: "kimi-k2.7-code",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 0.95,
      outputUsdPermillionTokens: 4,
    },
  },
  {
    id: "kimi-k3",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 3,
      outputUsdPermillionTokens: 15,
    },
  },
  {
    id: "muse-spark-1.3",
    provider: "cursor",
    pricing: {
      inputUsdPermillionTokens: 1.25,
      outputUsdPermillionTokens: 4.25,
    },
  },
] as const satisfies readonly SupportedChatModelDefinition[];

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = SupportedChatModel["id"];

/** Providers with end-to-end generate in this release. */
export const SELECTABLE_CHAT_PROVIDERS = ["local", "cursor"] as const satisfies readonly SupportedProvider[];

export type SelectableChatProvider = (typeof SELECTABLE_CHAT_PROVIDERS)[number];

export function findSupportedChatModelById(id: SupportedChatModelId): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === id);
}

export function findSupportedChatModel(
  provider: string,
  id: string,
): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find(
    (model) => model.provider === provider && model.id === id,
  );
}

/** Models the user can cycle/select for live chat (local + cursor). */
export function listSelectableChatModels(): SupportedChatModel[] {
  return SUPPORTED_CHAT_MODELS.filter((model) =>
    (SELECTABLE_CHAT_PROVIDERS as readonly string[]).includes(model.provider),
  );
}

export function nextSelectableChatModel(
  provider: string,
  modelId: string,
): SupportedChatModel {
  const selectable = listSelectableChatModels();
  if (selectable.length === 0) {
    return SUPPORTED_CHAT_MODELS[0]!;
  }
  const idx = selectable.findIndex(
    (m) => m.provider === provider && m.id === modelId,
  );
  const next = selectable[(idx + 1) % selectable.length];
  return next ?? selectable[0]!;
}

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "auto";
export const DEFAULT_CHAT_MODEL_PROVIDER: SupportedProvider = "cursor";