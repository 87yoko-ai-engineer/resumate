"use client";

import { authHeaders } from "@/lib/llm-client";
import type { OcrExtraction } from "@/lib/resume-schema";

/**
 * 画像OCR（過去の履歴書・職務経歴書の読み取り）をブラウザ側から呼び出すための補助。
 *
 * - 画像は利用者自身のAPIキー（BYOK）で、利用者が選んだAIへ送られる。
 * - サーバーには保存しない（/api/ocr はその場で処理して返すだけ）。
 */

export interface OcrFile {
  data: string; // base64（data URLのプレフィックスは含まない）
  mediaType: string;
}

/** Blob（File やクリップボード画像）を、APIに送る形式（base64 + MIMEタイプ）へ変換する。 */
export function blobToOcrFile(blob: Blob, fallbackType = "image/png"): Promise<OcrFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      // "data:image/png;base64,XXXX" の "XXXX" 部分だけを取り出す
      const data = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({ data, mediaType: blob.type || fallbackType });
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

/** ブラウザの File を、APIに送る形式へ変換する。 */
export function fileToOcrFile(file: File): Promise<OcrFile> {
  return blobToOcrFile(file);
}

/** 画像を /api/ocr に送り、学歴・職歴・職務経歴を構造化して受け取る。 */
export async function extractFromImages(files: OcrFile[]): Promise<OcrExtraction> {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "画像の読み取りに失敗しました。少し時間をおいてお試しください。");
  }
  return (await res.json()) as OcrExtraction;
}
