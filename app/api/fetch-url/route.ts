import { NextResponse } from "next/server";
import { getClientIp, isSameOrigin, rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_COUNT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10分

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ");
}

function extractText(html: string): string {
  // script/style/nav/footer を除去
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");

  // タグを削除
  text = text.replace(/<[^>]+>/g, " ");

  // HTML実体デコード
  text = decodeHtmlEntities(text);

  // 余分な空白を圧縮
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

export async function POST(req: Request) {
  // 同一オリジンチェック
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "不正なリクエスト元です。" }, { status: 403 });
  }

  // レート制限
  const limit = rateLimit(
    `fetch-url:${getClientIp(req)}`,
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

  let url: string;
  try {
    const body = await req.json();
    url = body.url;
    if (!url || typeof url !== "string") throw new Error("url required");
    // 簡易バリデーション
    new URL(url);
  } catch {
    return NextResponse.json({ error: "有効なURLを入力してください。" }, { status: 400 });
  }

  // URLフェッチ（10秒タイムアウト）
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ResumeBot/1.0)",
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { error: `ページの取得に失敗しました（HTTP ${response.status}）。` },
        { status: 422 },
      );
    }

    html = await response.text();
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "ページの取得がタイムアウトしました。"
        : "ページにアクセスできませんでした。URLをご確認ください。";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  const text = extractText(html);

  if (text.length < 300) {
    return NextResponse.json(
      {
        error:
          "JavaScriptで表示されるページや、ログインが必要なページは取得できません。求人票のテキストを直接貼り付けてください。",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ text: text.slice(0, 8000) });
}
