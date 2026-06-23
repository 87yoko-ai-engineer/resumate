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
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              応募先があれば「① 求人情報を貼り付け」で求人票やURLを分析します（任意）。
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>
                  <strong>履歴書をAIに読み込ませたくない場合</strong>は、「① 求人情報を貼り付け」の「この求人について相談を始める」を押すと、履歴書なしで求人に沿った相談だけを受けられます。
                </li>
              </ul>
            </li>
            <li>
              「② 履歴書作成」で経歴を入力します（次のいずれかの方法で）。
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>画像（スクリーンショットの貼り付け／スマホ撮影）からキャリア情報（学歴・職歴・資格・職務経歴など）を読み取る</li>
                <li>「直接入力」フォームに手で入力する</li>
                <li>左の「AIアシスタント」に、個人情報（氏名・住所・生年月日など）を含まない経歴の文章を貼り付けまたは音声で入力し、「この内容でフォームを埋めて」と頼む</li>
                <li>履歴書欄の志望の動機や自己PR、職務経歴書の書く欄の🎤（音声入力）で話して入力する</li>
              </ul>
            </li>
            <li>
              「② 履歴書作成」の「求人分析内容と応募者の経歴を踏まえたAIのヒアリングを開始する」ボタンを押すと、求人情報と経歴を踏まえたヒアリングを受けられます（求人を貼っていないときは「応募者の経歴を踏まえたヒアリングを開始する」）。AIが質問しながら職務要約・自己PRを一緒に磨きます（書類への反映は、あなたが承認したときだけ）。
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
              「② 履歴書作成」の画像の読み取りを使うと、画像そのものがあなたご自身のAIに送られます。氏名・住所などの個人情報が映らないようにしてください。
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
