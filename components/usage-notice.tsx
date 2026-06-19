"use client";

import { AlertTriangle, BookOpen, ShieldCheck } from "lucide-react";

export default function UsageNotice() {
  return (
    <details
      open
      className="rounded-md border border-slate-200 bg-white p-4 print:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
        <BookOpen className="size-4 text-slate-500" />
        はじめに ― 使い方とプライバシー
        <span className="ml-auto text-xs font-normal text-slate-400">
          クリックで開閉
        </span>
      </summary>

      <div className="mt-3 space-y-4 text-xs leading-relaxed text-slate-600">
        {/* 使い方 */}
        <div>
          <p className="mb-1 font-semibold text-slate-700">使い方</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              応募先があれば「① 求人情報を貼り付け」で求人票やURLを分析します（任意）。
            </li>
            <li>
              「② 履歴書作成」の「直接入力」フォームに経歴を入力します。または、左の「AIアシスタント」に経歴の文章を貼り付けて「この内容でフォームを埋めて」と頼むこともできます。
            </li>
            <li>
              「ヒアリングを開始」ボタンを押すと、AIが質問しながら職務要約・自己PRを一緒に磨きます（書類への反映は、あなたが承認したときだけ行われます）。
            </li>
          </ol>
        </div>

        {/* 安全なところ */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="size-4 shrink-0" />
            ここは安全（AIに送られません）
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              フォームや履歴書の各欄（氏名・住所・生年月日・写真など）に入れた内容は、お使いのブラウザの中（localStorage）だけに保存され、AIには送られません。
            </li>
            <li>
              AIに送られるのは、職歴・学歴・資格・スキル・志望動機・自己PRなどの「キャリア情報」だけです。
            </li>
          </ul>
        </div>

        {/* 注意するところ */}
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4 shrink-0" />
            ここは注意（AIや外部サービスに送られます）
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              左の「AIアシスタント」（チャット）に書いた文章はAIに送られます。氏名・住所・電話・メールなどの個人情報は、チャットに入れないでください。
            </li>
            <li>
              音声入力を使うと、話した音声がブラウザの音声認識サービス（Google Chromeの場合はGoogle）に送られます。個人情報は話さないでください。
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}
