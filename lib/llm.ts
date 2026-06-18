import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, type LanguageModel } from "ai";
import { DEFAULT_MODEL, normalizeModel, type Provider } from "@/lib/llm-models";

/**
 * 利用者が自分で持ち込んだ API キー（BYOK: Bring Your Own Key）を使う方式。
 *
 * - キーはサーバー側に保存しない。リクエストのヘッダで毎回受け取り、その場でだけ使う。
 * - Anthropic / OpenAI のどちらかを利用者が選べる。
 */

export const PROVIDER_HEADER = "x-llm-provider";
export const API_KEY_HEADER = "x-llm-api-key";
export const MODEL_HEADER = "x-llm-model";

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
  // 保存済みの古いモデルIDが送られてきても、現在の既定モデルへ戻す。
  const modelId = normalizeModel(
    provider,
    req.headers.get(MODEL_HEADER) ?? DEFAULT_MODEL[provider],
  );

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

/**
 * AIプロバイダ呼び出しのエラーを、利用者向けの分かりやすい日本語メッセージに変換する。
 * 「キー/モデルを確認」という総称ではなく、原因（キー無効・モデル非対応・レート制限・混雑）を
 * 見分けて、取るべき対処まで案内する。
 */
export function describeLlmError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 401 || status === 403) {
      return "APIキーが無効か、権限がありません。設定画面で新しいAPIキーを発行して貼り直してください。";
    }
    if (status === 404) {
      return "選んだモデルがこのAPIキーでは使えないようです。設定画面で別のモデルに変えてお試しください。";
    }
    if (status === 429) {
      return "短時間にリクエストが集中しました（レート制限）。1〜2分ほど待ってから再試行してください。";
    }
    if (typeof status === "number" && status >= 500) {
      return "AI提供側が一時的に混み合っています。少し待ってから再試行してください。";
    }
  }
  return "AIの呼び出しに失敗しました。APIキーと、選んだモデルがそのキーで使えるかをご確認のうえ、少し時間をおいて再試行してください。";
}
