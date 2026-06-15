"use client";

import { useCallback, useEffect, useState } from "react";
import { BRUSHUP_FIELDS } from "@/lib/resume-schema";
import type { BrushupField, ResumeData } from "@/lib/resume-schema";
import { authHeaders } from "@/lib/llm-client";

interface BrushupDialogProps {
  field: BrushupField;
  resume: ResumeData;
  jobPosting: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

export default function BrushupDialog({
  field,
  resume,
  jobPosting,
  onApply,
  onClose,
}: BrushupDialogProps) {
  const label = BRUSHUP_FIELDS[field];
  const originalText = resume[field] ?? "";

  const [loading, setLoading] = useState(true);
  const [improved, setImproved] = useState("");
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/brushup", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ field, originalText, resume, jobPosting }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "生成に失敗しました。");
      setImproved(data.improved ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [field, originalText, resume, jobPosting]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">
            「{label}」のAIブラッシュアップ
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              あなたが入力した原文
            </p>
            <div className="h-full whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {originalText || "（未入力）"}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-emerald-700">
              AIによる修正案
            </p>
            {loading ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                採用担当者に響く文章を作成中…
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : (
              <textarea
                value={improved}
                onChange={(e) => setImproved(e.target.value)}
                rows={10}
                className="h-full min-h-32 w-full resize-y rounded-md border border-emerald-300 bg-emerald-50/40 p-3 text-sm text-slate-800 outline-none focus:border-emerald-500"
              />
            )}
            {!loading && !error && (
              <p className="mt-1 text-xs text-slate-400">
                修正案はそのまま編集できます。
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600"
          >
            却下して閉じる
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-40"
          >
            再生成
          </button>
          <button
            onClick={() => onApply(improved)}
            disabled={loading || !!error || !improved.trim()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            この内容で承認・反映
          </button>
        </div>
      </div>
    </div>
  );
}
