import { generateText } from "ai";
import { buildBrushupPrompt } from "@/lib/prompts";
import { BRUSHUP_FIELDS, emptyResume } from "@/lib/resume-schema";
import type { BrushupField, ResumeData } from "@/lib/resume-schema";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";
import { CredentialsError, resolveModelFromRequest, type ResolvedModel } from "@/lib/llm";

export const maxDuration = 60;

// --- セキュリティ上の制限値（通常利用では当たらない緩さに設定）---
const MAX_BODY_BYTES = 60_000; // リクエストボディの上限
const MAX_TEXT_LEN = 8_000; // 1フィールドあたりの文字数上限
const RATE_LIMIT = 40; // 1ウィンドウあたりのリクエスト数
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10分

interface BrushupRequest {
  field: BrushupField;
  originalText: string;
  resume: ResumeData;
  jobPosting: string;
}

export async function POST(req: Request) {
  // 利用者の API キー（BYOK）からモデルを解決
  let resolved: ResolvedModel;
  try {
    resolved = resolveModelFromRequest(req);
  } catch (e) {
    if (e instanceof CredentialsError) {
      return Response.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  // 同一オリジンチェック
  if (!isSameOrigin(req)) {
    return Response.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  // レート制限
  const limit = rateLimit(
    `brushup:${getClientIp(req)}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!limit.allowed) {
    return Response.json(
      {
        error: `ブラッシュアップの利用が集中しています。約${Math.ceil(
          limit.retryAfterSec / 60,
        )}分ほど時間をおいて再度お試しください。`,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  // ボディサイズの上限
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "送信データが大きすぎます。" }, { status: 413 });
  }

  let body: Partial<BrushupRequest>;
  try {
    body = JSON.parse(raw) as Partial<BrushupRequest>;
  } catch {
    return Response.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const field = body.field;
  const originalText = (body.originalText ?? "").trim();

  if (!field || !(field in BRUSHUP_FIELDS)) {
    return Response.json({ error: "対象フィールドが不正です。" }, { status: 400 });
  }
  if (!originalText) {
    return Response.json(
      { error: "ブラッシュアップする文章が入力されていません。" },
      { status: 400 },
    );
  }
  if (originalText.length > MAX_TEXT_LEN) {
    return Response.json(
      { error: "文章が長すぎます。短くしてからお試しください。" },
      { status: 400 },
    );
  }

  const resume = { ...emptyResume(), ...body.resume };
  const jobPosting = (body.jobPosting ?? "").trim().slice(0, MAX_TEXT_LEN);

  try {
    const { text } = await generateText({
      model: resolved.model,
      prompt: buildBrushupPrompt(field, originalText, resume, jobPosting),
      // 1リクエストあたりのコストを一定範囲に固定
      maxOutputTokens: 1500,
    });
    return Response.json({ improved: text.trim() });
  } catch (err) {
    // 内部エラーの詳細はクライアントに返さない
    console.error("brushup error:", err);
    return Response.json(
      {
        error:
          "ブラッシュアップの生成に失敗しました。時間をおいて再試行してください。",
      },
      { status: 500 },
    );
  }
}
