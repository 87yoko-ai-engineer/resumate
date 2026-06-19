"use client";

import type { ReactNode } from "react";
import { FileUp, Keyboard, Mic, Sparkles } from "lucide-react";

interface ResumeInputMethodsProps {
  onDirectInput: () => void;
  onStartAdvisor: () => void;
  hasJobAnalysis: boolean;
}

export default function ResumeInputMethods({
  onDirectInput,
  onStartAdvisor,
  hasJobAnalysis,
}: ResumeInputMethodsProps) {
  const advisorLabel = hasJobAnalysis
    ? "求人分析内容と応募者の経歴を踏まえたAIのヒアリングを開始する"
    : "応募者の経歴を踏まえたヒアリングを開始する";
  const advisorHint = hasJobAnalysis
    ? "求人分析の結果とあなたの履歴書を照らし合わせて、AIが魅力を引き出す質問をします。"
    : "あなたの履歴書をもとに、AIが魅力を引き出す質問をします。（①に求人を貼ると、求人と照合します）";
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 print:hidden">
      <div>
        <p className="text-xs font-semibold text-slate-500">② 履歴書作成</p>
        <h2 className="text-lg font-bold text-slate-900">
          入力方法を選んで、履歴書情報を整えます
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InputMethodCard
          icon={<FileUp className="size-5" />}
          title="画像添付"
          description="過去の履歴書・職務経歴書の画像やPDFから、学歴・職歴だけをAIが読み取ってフォームに転記します。読み取った内容は、反映前にご自身で確認・修正できます。"
          notice="氏名・住所・生年月日・電話・メール・顔写真の欄は写さないでください（その箇所を紙などで隠した状態で撮影してください）。画像はあなたご自身のAPIキーでAIに送られます。"
          actionLabel="次フェーズで対応"
          status="実装は次フェーズ。いまは見え方だけ整えています"
          disabled
        />
        <InputMethodCard
          icon={<Mic className="size-5" />}
          title="音声入力"
          description="質問シート形式で話して入力する入口です。音声入力の本実装は後続Phaseで行います。"
          actionLabel="次フェーズで対応"
          status="既存フォーム内の音声入力は維持"
          disabled
        />
        <InputMethodCard
          icon={<Keyboard className="size-5" />}
          title="直接入力"
          description="既存の履歴書・職務経歴書フォームで、そのまま手入力や修正ができます。"
          actionLabel="フォームへ移動"
          status="写真撮影・AIブラッシュアップも既存どおり利用可能"
          onAction={onDirectInput}
        />
      </div>

      <div className="space-y-1 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onStartAdvisor}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Sparkles className="size-4 shrink-0" />
          {advisorLabel}
        </button>
        <p className="text-center text-xs text-slate-500">{advisorHint}</p>
      </div>
    </section>
  );
}

function InputMethodCard({
  icon,
  title,
  description,
  notice,
  actionLabel,
  status,
  disabled = false,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  notice?: string;
  actionLabel: string;
  status: string;
  disabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[180px] flex-col rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <span className="flex size-9 items-center justify-center rounded-md bg-white text-slate-700 shadow-sm">
          {icon}
        </span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <p className="min-h-[48px] text-xs leading-relaxed text-slate-600">
        {description}
      </p>
      {notice ? (
        <p className="mt-3 flex gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
          <span aria-hidden className="shrink-0">
            ⚠️
          </span>
          <span>{notice}</span>
        </p>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{status}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="mt-auto rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {actionLabel}
      </button>
    </div>
  );
}
