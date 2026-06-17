export type Provider = "anthropic" | "openai";

export interface ModelOption {
  id: string;
  label: string;
}

export const MODEL_OPTIONS: Record<Provider, ModelOption[]> = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6（推奨）" },
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    {
      id: "claude-haiku-4-5-20251001",
      label: "Claude Haiku 4.5（高速・低コスト）",
    },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o（推奨）" },
    { id: "gpt-4o-mini", label: "GPT-4o mini（高速・低コスト）" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini（高速・低コスト）" },
  ],
};

export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

export function normalizeModel(provider: Provider, model?: string | null): string {
  const candidate = model?.trim();
  if (
    candidate &&
    MODEL_OPTIONS[provider].some((option) => option.id === candidate)
  ) {
    return candidate;
  }
  return DEFAULT_MODEL[provider];
}
