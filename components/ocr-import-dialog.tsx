"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { OcrExtraction } from "@/lib/resume-schema";

type EduRow = OcrExtraction["education"][number];
type WorkRow = OcrExtraction["workHistory"][number];
type CareerRow = OcrExtraction["careers"][number];

interface OcrImportDialogProps {
  extraction: OcrExtraction;
  onApply: (edited: OcrExtraction) => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-500";

export default function OcrImportDialog({
  extraction,
  onApply,
  onClose,
}: OcrImportDialogProps) {
  const [education, setEducation] = useState<EduRow[]>(extraction.education);
  const [workHistory, setWorkHistory] = useState<WorkRow[]>(
    extraction.workHistory,
  );
  const [careers, setCareers] = useState<CareerRow[]>(extraction.careers);

  const total = education.length + workHistory.length + careers.length;

  function apply() {
    // 中身が完全に空の行は除いてから反映する。
    const cleanEducation = education.filter(
      (e) => e.year || e.month || e.description.trim(),
    );
    const cleanWork = workHistory.filter(
      (w) => w.year || w.month || w.description.trim(),
    );
    const cleanCareers = careers.filter(
      (c) => c.company.trim() || c.period.trim() || c.role.trim() || c.description.trim(),
    );
    onApply({
      education: cleanEducation,
      workHistory: cleanWork,
      careers: cleanCareers,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">
            読み取り結果の確認（学歴{education.length}件・職歴{workHistory.length}件・職務経歴{careers.length}件）
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {/* 本文 */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            AIが画像から読み取った内容です。<strong>誤りはここで直してから</strong>「フォームに反映」してください。氏名・住所・生年月日などの個人情報は読み取っていません。
          </p>

          {total === 0 && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              画像から学歴・職歴・職務経歴を読み取れませんでした。下の「行を追加」で手入力するか、画像を変えてもう一度お試しください。
            </p>
          )}

          {/* 学歴 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">学歴</h4>
            {education.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  className={`${inputClass} w-20`}
                  placeholder="西暦"
                  value={row.year}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, year: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className={`${inputClass} w-14`}
                  placeholder="月"
                  value={row.month}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, month: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className={inputClass}
                  placeholder="学校名・学部学科・入学/卒業など"
                  value={row.description}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((r, j) =>
                        j === i ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                />
                <button
                  onClick={() => setEducation((prev) => prev.filter((_, j) => j !== i))}
                  className="mt-1 shrink-0 text-slate-400 hover:text-red-500"
                  title="この行を削除"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <AddRowButton
              label="学歴の行を追加"
              onClick={() =>
                setEducation((prev) => [...prev, { year: "", month: "", description: "" }])
              }
            />
          </section>

          {/* 職歴 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">職歴（履歴書）</h4>
            {workHistory.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  className={`${inputClass} w-20`}
                  placeholder="西暦"
                  value={row.year}
                  onChange={(e) =>
                    setWorkHistory((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, year: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className={`${inputClass} w-14`}
                  placeholder="月"
                  value={row.month}
                  onChange={(e) =>
                    setWorkHistory((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, month: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className={inputClass}
                  placeholder="会社名・入社/退社など"
                  value={row.description}
                  onChange={(e) =>
                    setWorkHistory((prev) =>
                      prev.map((r, j) =>
                        j === i ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                />
                <button
                  onClick={() => setWorkHistory((prev) => prev.filter((_, j) => j !== i))}
                  className="mt-1 shrink-0 text-slate-400 hover:text-red-500"
                  title="この行を削除"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <AddRowButton
              label="職歴の行を追加"
              onClick={() =>
                setWorkHistory((prev) => [...prev, { year: "", month: "", description: "" }])
              }
            />
          </section>

          {/* 職務経歴 */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-slate-700">職務経歴（職務経歴書）</h4>
            {careers.map((row, i) => (
              <div key={i} className="space-y-2 rounded-md border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder="会社名"
                    value={row.company}
                    onChange={(e) =>
                      setCareers((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, company: e.target.value } : r)),
                      )
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="在籍期間 例: 2020年4月〜2023年3月"
                    value={row.period}
                    onChange={(e) =>
                      setCareers((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, period: e.target.value } : r)),
                      )
                    }
                  />
                  <button
                    onClick={() => setCareers((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0 text-slate-400 hover:text-red-500"
                    title="この職務経歴を削除"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <input
                  className={inputClass}
                  placeholder="役職・担当業務の見出し"
                  value={row.role}
                  onChange={(e) =>
                    setCareers((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, role: e.target.value } : r)),
                    )
                  }
                />
                <textarea
                  className={`${inputClass} min-h-16 resize-y`}
                  placeholder="具体的な業務内容・実績"
                  value={row.description}
                  onChange={(e) =>
                    setCareers((prev) =>
                      prev.map((r, j) =>
                        j === i ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <AddRowButton
              label="職務経歴を追加"
              onClick={() =>
                setCareers((prev) => [
                  ...prev,
                  { company: "", period: "", role: "", description: "" },
                ])
              }
            />
          </section>
        </div>

        {/* フッター */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <span className="mr-auto text-xs text-slate-400">
            既存のフォーム内容は消さず、後ろに追記します。
          </span>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600"
          >
            キャンセル
          </button>
          <button
            onClick={apply}
            disabled={total === 0}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            この内容をフォームに反映
          </button>
        </div>
      </div>
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
    >
      <Plus className="size-3.5" />
      {label}
    </button>
  );
}
