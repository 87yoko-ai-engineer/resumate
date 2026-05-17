import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { buildChatSystemPrompt } from "@/lib/prompts";
import { resumeUpdateSchema } from "@/lib/resume-schema";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// --- セキュリティ上の制限値（通常利用では当たらない緩さに設定）---
const MAX_BODY_BYTES = 200_000; // リクエストボディの上限
const MAX_MESSAGES = 120; // 会話ターン数の上限
const RATE_LIMIT = 200; // 1ウィンドウあたりのリクエスト数
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10分

function errorJson(message: string, status: number, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

export async function POST(req: Request) {
  // 1. APIキーの存在確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return errorJson("サーバー側の設定が未完了です（APIキー未設定）。", 500);
  }

  // 2. 同一オリジンチェック（他サイトからの直接呼び出しを拒否）
  if (!isSameOrigin(req)) {
    return errorJson("不正なリクエスト元です。", 403);
  }

  // 3. レート制限
  const limit = rateLimit(`chat:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return errorJson(
      `アクセスが集中しています。約${Math.ceil(limit.retryAfterSec / 60)}分ほど時間をおいて再開してください。`,
      429,
      { "retry-after": String(limit.retryAfterSec) },
    );
  }

  // 4. ボディサイズの上限
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return errorJson("送信データが大きすぎます。", 413);
  }

  let messages: UIMessage[];
  let jobPosting: string;
  let jobAnalysis: { companyName: string; requirements: string; questions: string[] } | null;
  try {
    const parsed = JSON.parse(raw) as {
      messages?: UIMessage[];
      jobPosting?: string;
      jobAnalysis?: { companyName: string; requirements: string; questions: string[] } | null;
    };
    messages = parsed.messages ?? [];
    jobPosting = parsed.jobPosting ?? "";
    jobAnalysis = parsed.jobAnalysis ?? null;
  } catch {
    return errorJson("リクエストの形式が不正です。", 400);
  }

  // 5. 会話ターン数の上限
  if (messages.length > MAX_MESSAGES) {
    return errorJson(
      "会話が長くなりすぎました。ページを再読み込みして続きから編集してください。",
      400,
    );
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic(MODEL),
    system: buildChatSystemPrompt(jobPosting, jobAnalysis),
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    // 1リクエストあたりのコストを一定範囲に固定
    maxOutputTokens: 2000,
    tools: {
      updateResumeFields: tool({
        description:
          "ユーザーの回答から判明した履歴書・職務経歴書の情報を反映する。新しい情報が分かるたびに呼び出す。",
        inputSchema: resumeUpdateSchema,
        // execute を持たないクライアントサイドツール。結果は画面側で処理する。
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
