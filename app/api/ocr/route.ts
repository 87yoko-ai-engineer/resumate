import { NextResponse } from "next/server";
import { generateObject, type ImagePart } from "ai";
import { ocrExtractionSchema } from "@/lib/resume-schema";
import { OCR_SYSTEM_PROMPT } from "@/lib/prompts";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";
import {
  CredentialsError,
  describeLlmError,
  resolveModelFromRequest,
  type ResolvedModel,
} from "@/lib/llm";

export const maxDuration = 60;

// --- セキュリティ上の制限値 ---
// 画像のbase64データを含むため、テキスト系のAPIより上限を大きめに取る。
const MAX_BODY_BYTES = 12_000_000; // 約12MB（base64込み）
const MAX_FILES = 4; // 一度に添付できる画像枚数
const RATE_LIMIT_COUNT = 20; // 1ウィンドウあたりのリクエスト数
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10分

// 対応する画像のMIMEタイプ（現時点は画像のみ。PDFは次のステップで対応）。
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

interface OcrFile {
  data: string; // base64（data URLのプレフィックスは含まない）
  mediaType: string;
}

export async function POST(req: Request) {
  // 1. 利用者の API キー（BYOK）からモデルを解決
  let resolved: ResolvedModel;
  try {
    resolved = resolveModelFromRequest(req);
  } catch (e) {
    if (e instanceof CredentialsError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  // 2. 同一オリジンチェック
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  // 3. レート制限
  const limit = rateLimit(`ocr:${getClientIp(req)}`, RATE_LIMIT_COUNT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `アクセスが集中しています。約${Math.ceil(limit.retryAfterSec / 60)}分ほど時間をおいて再開してください。`,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  // 4. ボディサイズの上限
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error:
          "画像のサイズが大きすぎます。スマホで撮影しなおすか、画像を小さくしてからお試しください。",
      },
      { status: 413 },
    );
  }

  let files: OcrFile[];
  try {
    const body = JSON.parse(raw) as { files?: OcrFile[] };
    files = Array.isArray(body.files) ? body.files : [];
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "画像が添付されていません。" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `画像は一度に${MAX_FILES}枚までです。` },
      { status: 400 },
    );
  }

  // 画像パートを組み立てる（現時点は画像のみ）。
  const imageParts: ImagePart[] = [];
  for (const f of files) {
    if (!f || typeof f.data !== "string" || !ALLOWED_IMAGE_TYPES.has(f.mediaType)) {
      return NextResponse.json(
        { error: "対応していないファイル形式です。JPEG / PNG などの画像を添付してください。" },
        { status: 400 },
      );
    }
    imageParts.push({ type: "image", image: f.data, mediaType: f.mediaType });
  }

  // 5. 利用者自身のAIへ画像を送り、個人情報を除いたキャリア情報を構造化して受け取る。
  try {
    const { object } = await generateObject({
      model: resolved.model,
      schema: ocrExtractionSchema,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "添付の画像（過去の履歴書・職務経歴書）から、氏名・住所などの個人情報を除いたキャリア情報（学歴・職歴・免許資格・職務経歴・職務要約・スキル・自己PR・志望動機）を読み取り、指定のJSON構造で返してください。氏名・住所・生年月日・電話・メールなどの個人情報は無視して、出力に含めないでください。",
            },
            ...imageParts,
          ],
        },
      ],
      maxOutputTokens: 2000,
    });
    return NextResponse.json(object);
  } catch (e) {
    return NextResponse.json({ error: describeLlmError(e) }, { status: 502 });
  }
}
