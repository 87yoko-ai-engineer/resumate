"use client";

import { ADVISOR_FIELDS, type AdvisorSuggestion } from "@/lib/resume-schema";

export type SuggestionState = "pending" | "approved" | "rejected";

interface SuggestionApprovalProps {
  suggestion: AdvisorSuggestion;
  state: SuggestionState;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * チャット中のAIキャリアアドバイザーが出す「改善案」を、本人が承認/却下するための専用UI。
 * 承認するまで履歴書データには反映されない（手動ブラッシュアップの BrushupDialog とは別物）。
 */
export default function SuggestionApproval({
  suggestion,
  state,
  onApprove,
  onReject,
}: SuggestionApprovalProps) {
  const label = ADVISOR_FIELDS[suggestion.targetField] ?? suggestion.targetField;

  if (state === "approved") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
        ✓ 「{label}」の改善案を承認し、書類に反映しました
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
        「{label}」の改善案は却下しました（書類は変更していません）
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-emerald-300 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-semibold text-emerald-800">
          AIからの改善提案：「{label}」
        </p>
      </div>

      <div className="space-y-2 p-3">
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-slate-400">元の内容</p>
          <div className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
            {suggestion.originalText?.trim() || "（新規作成）"}
          </div>
        </div>
        <div>
          <p className="mb-0.5 text-[11px] font-medium text-emerald-700">改善案</p>
          <div className="whitespace-pre-wrap rounded border border-emerald-300 bg-emerald-50/50 p-2 text-xs text-slate-800">
            {suggestion.suggestedText}
          </div>
        </div>
        {suggestion.reason?.trim() && (
          <p className="text-[11px] leading-relaxed text-slate-500">
            <span className="font-medium text-slate-600">提案の理由：</span>
            {suggestion.reason}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={onReject}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          却下
        </button>
        <button
          type="button"
          onClick={onApprove}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          承認して反映
        </button>
      </div>
    </div>
  );
}
