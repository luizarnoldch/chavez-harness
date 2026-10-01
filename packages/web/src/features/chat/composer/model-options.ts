import { listSelectableChatModels } from "@chavez-harness/shared";

export type ModelChoice = { provider: string; model: string };

export type ModelGroup = {
  provider: string;
  label: string;
  models: string[];
};

const PROVIDER_LABEL: Record<string, string> = {
  local: "Local (mock)",
  cursor: "Cursor",
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider;
}

/** `listSelectableChatModels()` grouped by provider, in catalogue order. */
export function selectableModelGroups(): ModelGroup[] {
  const groups = new Map<string, ModelGroup>();
  for (const model of listSelectableChatModels()) {
    let group = groups.get(model.provider);
    if (!group) {
      group = { provider: model.provider, label: providerLabel(model.provider), models: [] };
      groups.set(model.provider, group);
    }
    if (!group.models.includes(model.id)) group.models.push(model.id);
  }
  return [...groups.values()];
}

export function choiceKey(choice: ModelChoice): string {
  return `${choice.provider}:${choice.model}`;
}

export function parseChoiceKey(key: string): ModelChoice {
  const idx = key.indexOf(":");
  return { provider: key.slice(0, idx), model: key.slice(idx + 1) };
}
