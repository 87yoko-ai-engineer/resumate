"use client";

import { useEffect, useState } from "react";
import ChatPanel from "@/components/chat-panel";
import ResumePreview from "@/components/resume-preview";
import JobPostingInput from "@/components/job-posting-input";
import BrushupDialog from "@/components/brushup-dialog";
import {
  DOC_LABELS,
  emptyResume,
  mergeUpdate,
  type BrushupField,
  type DocType,
  type JobAnalysis,
  type ResumeData,
  type ResumeUpdate,
} from "@/lib/resume-schema";
import { loadState, saveState } from "@/lib/storage";

export default function Home() {
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [jobPosting, setJobPosting] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [hiringTrigger, setHiringTrigger] = useState(0);
  const [docType, setDocType] = useState<DocType>("resume");
  const [brushupField, setBrushupField] = useState<BrushupField | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 初回マウント時に localStorage から復元
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setResume(saved.resume);
      setJobPosting(saved.jobPosting);
    }
    setLoaded(true);
  }, []);

  // 変更を localStorage に自動保存（復元完了後のみ）
  useEffect(() => {
    if (!loaded) return;
    saveState({ resume, jobPosting });
  }, [resume, jobPosting, loaded]);

  function handleResumeUpdate(update: ResumeUpdate) {
    setResume((prev) => mergeUpdate(prev, update));
  }

  function handleBrushupApply(text: string) {
    if (!brushupField) return;
    setResume((prev) => ({ ...prev, [brushupField]: text }));
    setBrushupField(null);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* ヘッダー */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 print:hidden">
        <h1 className="text-sm font-bold text-slate-800">
          AI履歴書作成サービス
        </h1>
        <div className="flex items-center gap-3">
          {/* 履歴書 / 職務経歴書 切替 */}
          <div className="flex rounded-md border border-slate-300 p-0.5 text-xs">
            {(Object.keys(DOC_LABELS) as DocType[]).map((t) => (
              <button
                key={t}
                onClick={() => setDocType(t)}
                className={`rounded px-3 py-1 font-medium ${
                  docType === t
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {DOC_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            印刷 / PDF出力
          </button>
        </div>
      </header>

      {/* 2カラム */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: チャット */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white print:hidden">
          <ChatPanel
              onResumeUpdate={handleResumeUpdate}
              jobPosting={jobPosting}
              jobAnalysis={jobAnalysis}
              hiringTrigger={hiringTrigger}
            />
        </div>

        {/* 右: プレビュー */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-[820px] space-y-4 print:max-w-none">
            <JobPostingInput
                value={jobPosting}
                onChange={setJobPosting}
                onAnalysis={(a) => setJobAnalysis(a)}
                onStartHiring={() => setHiringTrigger((t) => t + 1)}
                analysis={jobAnalysis}
              />
            <ResumePreview
              resume={resume}
              docType={docType}
              onChange={setResume}
              onBrushup={setBrushupField}
            />
          </div>
        </div>
      </div>

      {/* ブラッシュアップダイアログ */}
      {brushupField && (
        <BrushupDialog
          field={brushupField}
          resume={resume}
          jobPosting={jobPosting}
          onApply={handleBrushupApply}
          onClose={() => setBrushupField(null)}
        />
      )}
    </div>
  );
}
