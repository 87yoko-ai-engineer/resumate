import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { buildChatSystemPrompt } from "@/lib/prompts";
import { resumeUpdateSchema, advisorSuggestionSchema } from "@/lib/resume-schema";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";
import { CredentialsError, describeLlmError, resolveModelFromRequest, type ResolvedModel } from "@/lib/llm";

export const maxDuration = 60;

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
  // 1. 利用者の API キー（BYOK）からモデルを解決
  let resolved: ResolvedModel;
  try {
    resolved = resolveModelFromRequest(req);
  } catch (e) {
    if (e instanceof CredentialsError) return errorJson(e.message, 401);
    throw e;
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
  let applicantProfile: string;
  try {
    const parsed = JSON.parse(raw) as {
      messages?: UIMessage[];
      jobPosting?: string;
      jobAnalysis?: { companyName: string; requirements: string; questions: string[] } | null;
      applicantProfile?: string;
    };
    messages = parsed.messages ?? [];
    jobPosting = parsed.jobPosting ?? "";
    jobAnalysis = parsed.jobAnalysis ?? null;
    applicantProfile = parsed.applicantProfile ?? "";
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
    model: resolved.model,
    system: buildChatSystemPrompt(jobPosting, jobAnalysis, applicantProfile),
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    // 1リクエストあたりのコストを一定範囲に固定
    maxOutputTokens: 2000,
    tools: {
      updateResumeFields: tool({
        description:
          "ユーザーの回答から判明した履歴書・職務経歴書の『事実』（学歴・職歴・資格・基本情報・職務経歴）を反映する。自己PR・志望動機・職務要約・スキル欄はここでは扱わない。",
        inputSchema: resumeUpdateSchema,
        // execute を持たないクライアントサイドツール。結果は画面側で処理する。
      }),
      proposeImprovement: tool({
        description:
          "自己PR・志望動機・職務要約・スキル欄の改善案を、本人の承認を得るために提示する。これら4項目は必ずこのツールで提案し、updateResumeFields では直接書き換えない。承認・反映は画面側で本人が行う。",
        inputSchema: advisorSuggestionSchema,
        // execute を持たないクライアントサイドツール。承認UIで本人が承認/却下する。
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => describeLlmError(error),
  });
}
