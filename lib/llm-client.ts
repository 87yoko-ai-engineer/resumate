"use client";

import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  normalizeModel,
  type ModelOption,
  type Provider,
} from "@/lib/llm-models";

/**
 * 利用者の API キー（BYOK）をブラウザ内だけで扱うためのユーティリティ。
 *
 * - キーは localStorage に保存し、利用者本人のブラウザの中だけに残る。
 * - サーバーへはリクエストのたびにヘッダで渡すだけで、サーバー側には保存しない。
 */

export {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  normalizeModel,
  type ModelOption,
  type Provider,
} from "@/lib/llm-models";

export const PROVIDER_HEADER = "x-llm-provider";
export const API_KEY_HEADER = "x-llm-api-key";
export const MODEL_HEADER = "x-llm-model";

const STORAGE_KEY = "resumate:llm-credentials";

export interface LlmCredentials {
  provider: Provider;
  apiKey: string;
  /** 利用するモデルID。未指定なら各プロバイダの既定モデルを使う。 */
  model?: string;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic（Claude）",
  openai: "OpenAI（ChatGPT）",
};

/** キー取得先の案内 */
export const PROVIDER_KEY_URLS: Record<Provider, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
};

export function loadCredentials(): LlmCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LlmCredentials>;
    if (
      (parsed.provider === "anthropic" || parsed.provider === "openai") &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.trim().length > 0
    ) {
      const model = normalizeModel(parsed.provider, parsed.model);
      return { provider: parsed.provider, apiKey: parsed.apiKey, model };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: LlmCredentials): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...creds,
      apiKey: creds.apiKey.trim(),
      model: normalizeModel(creds.provider, creds.model),
    }),
  );
}

export function clearCredentials(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null;
}

/**
 * fetch に付与する認証ヘッダを返す。キー未設定なら空オブジェクト。
 * 呼び出しのたびに最新の localStorage を読むので、設定変更が即反映される。
 */
export function authHeaders(): Record<string, string> {
  const creds = loadCredentials();
  if (!creds) return {};
  return {
    [PROVIDER_HEADER]: creds.provider,
    [API_KEY_HEADER]: creds.apiKey,
    [MODEL_HEADER]: creds.model ?? DEFAULT_MODEL[creds.provider],
  };
}
