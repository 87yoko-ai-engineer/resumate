/**
 * インメモリのレート制限ユーティリティ。
 *
 * - DBを使わない方針のため、関数インスタンスのメモリ上でカウントする。
 * - 複数インスタンス間では厳密でないが、API課金の悪用を防ぐ目的では十分。
 * - 閾値は「履歴書1枚を作り切る通常利用では絶対に当たらない」緩さに設定する。
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** 制限が解除される時刻（epoch ms） */
  resetAt: number;
  /** 解除までの秒数 */
  retryAfterSec: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // メモリ肥大化を防ぐため、期限切れエントリを掃除する
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
      retryAfterSec: 0,
    };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSec: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/** リクエスト元のIPアドレスを推定する（Vercel/プロキシ環境を考慮）。 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * 同一オリジンからのリクエストか検証する。
 * 他サイトのJavaScriptからAPIを直接叩かれるのを防ぐ。
 * Origin ヘッダが無いリクエスト（ブラウザ外）は判定しない（true）。
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
