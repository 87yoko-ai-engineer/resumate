import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";
import type { JobAnalysis } from "@/lib/resume-schema";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
const RATE_LIMIT_COUNT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10分

export async function POST(req: Request) {
  // APIキー確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "サーバー側の設定が未完了です（APIキー未設定）。" },
      { status: 500 },
    );
  }

  // 同一オリジンチェック
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  // レート制限
  const limit = rateLimit(
    `analyze-job:${getClientIp(req)}`,
    RATE_LIMIT_COUNT,
    RATE_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `アクセスが集中しています。約${Math.ceil(limit.retryAfterSec / 60)}分ほど時間をおいて再開してください。`,
      },
      { status: 429 },
    );
  }

  let jobText: string;
  try {
    const body = await req.json();
    jobText = body.jobText;
    if (!jobText || typeof jobText !== "string") throw new Error("jobText required");
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const prompt = `以下の求人情報を分析し、下記のJSON形式のみで回答してください。説明文や前置きは不要です。

求人情報:
${jobText}

必ず以下のJSON形式で出力してください:
{
  "companyName": "会社名（不明なら空文字）",
  "requirements": "求める人物像の要約（200字以内）",
  "motivationDraft": "志望動機の参照雛形（350字程度）",
  "selfPRDraft": "自己PRの参照雛形（350字程度）",
  "questions": ["質問1", "質問2", "質問3", "質問4", "質問5"]
}

questionsは、この求人に応募する候補者から聞き出すべき情報（経験・スキル・動機など）に関する具体的な質問を5つ作成してください。`;

  let analysisText: string;
  try {
    const result = await generateText({
      model: anthropic(MODEL),
      prompt,
      maxOutputTokens: 1500,
    });
    analysisText = result.text;
  } catch {
    return NextResponse.json(
      { error: "求人分析中にエラーが発生しました。しばらくしてから再試行してください。" },
      { status: 500 },
    );
  }

  // JSONをパース
  const match = analysisText.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json(
      { error: "分析結果の解析に失敗しました。再試行してください。" },
      { status: 500 },
    );
  }

  let analysis: JobAnalysis;
  try {
    analysis = JSON.parse(match[0]) as JobAnalysis;
  } catch {
    return NextResponse.json(
      { error: "分析結果の解析に失敗しました。再試行してください。" },
      { status: 500 },
    );
  }

  return NextResponse.json(analysis);
}
