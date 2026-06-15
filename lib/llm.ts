import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * 利用者が自分で持ち込んだ API キー（BYOK: Bring Your Own Key）を使う方式。
 *
 * - キーはサーバー側に保存しない。リクエストのヘッダで毎回受け取り、その場でだけ使う。
 * - Anthropic / OpenAI のどちらかを利用者が選べる。
 */

export type Provider = "anthropic" | "openai";

export const PROVIDER_HEADER = "x-llm-provider";
export const API_KEY_HEADER = "x-llm-api-key";
export const MODEL_HEADER = "x-llm-model";

// 各プロバイダの既定モデル（利用者が選んだプロバイダに応じて使い分ける）
// ※ 実在するモデルIDを指定すること。存在しないIDだとAnthropic/OpenAIが404を返し、AIが一切応答しない。
export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
};

/** API キーが渡されていない／プロバイダ指定が不正なときに投げるエラー。 */
export class CredentialsError extends Error {}

export interface ResolvedModel {
  model: LanguageModel;
  provider: Provider;
}

function normalizeProvider(value: string | null): Provider {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "openai") return "openai";
  if (v === "anthropic") return "anthropic";
  throw new CredentialsError(
    "利用するAIプロバイダが選択されていません（Anthropic または OpenAI）。",
  );
}

/**
 * リクエストヘッダから利用者の認証情報を読み取り、対応する言語モデルを返す。
 * キーが無い場合は CredentialsError を投げる（呼び出し側で 401 を返す）。
 */
export function resolveModelFromRequest(req: Request): ResolvedModel {
  const provider = normalizeProvider(req.headers.get(PROVIDER_HEADER));
  const apiKey = (req.headers.get(API_KEY_HEADER) ?? "").trim();
  // 利用者が選んだモデルID（未指定なら既定モデル）
  const modelId =
    (req.headers.get(MODEL_HEADER) ?? "").trim() || DEFAULT_MODELS[provider];

  if (!apiKey) {
    throw new CredentialsError(
      "APIキーが設定されていません。画面右上の「APIキー設定」から入力してください。",
    );
  }

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return { model: openai(modelId), provider };
  }

  const anthropic = createAnthropic({ apiKey });
  return { model: anthropic(modelId), provider };
}
