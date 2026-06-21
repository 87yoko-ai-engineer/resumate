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

// 本番（Vercel）には送信データ量の上限があるため、大きな画像は送る前に縮小・圧縮する。
// スマホ写真（数MB）でも確実に送れるようにしつつ、文字が読める品質は保つ。
const MAX_DIMENSION = 2000; // 長辺の最大ピクセル
const PASSTHROUGH_MAX_BYTES = 1_500_000; // これ以下かつ小さい画像はそのまま使う（再エンコードで劣化させない）
const JPEG_QUALITY = 0.85;

/** 大きい画像だけ縮小＋JPEG化する。小さい画像や、処理に失敗した場合はそのまま返す。 */
async function compressImageForOcr(blob: Blob): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== "function") return blob;
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    const needsResize = longest > MAX_DIMENSION;
    if (!needsResize && blob.size <= PASSTHROUGH_MAX_BYTES) {
      bitmap.close();
      return blob; // 十分小さいのでそのまま
    }
    const scale = needsResize ? MAX_DIMENSION / longest : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
    );
    return out ?? blob;
  } catch {
    return blob; // 失敗時は元の画像で送る
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

/** Blob（File やクリップボード画像）を、APIに送る形式（base64 + MIMEタイプ）へ変換する。
 *  大きい画像は自動で縮小・圧縮してから変換する。 */
export async function blobToOcrFile(blob: Blob, fallbackType = "image/png"): Promise<OcrFile> {
  const prepared = await compressImageForOcr(blob);
  const dataUrl = await readAsDataUrl(prepared);
  const comma = dataUrl.indexOf(",");
  // "data:image/jpeg;base64,XXXX" の "XXXX" 部分だけを取り出す
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return { data, mediaType: prepared.type || fallbackType };
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
