"use client";

import { useEffect, useState } from "react";
import ChatPanel from "@/components/chat-panel";
import ResumePreview from "@/components/resume-preview";
import JobPostingInput from "@/components/job-posting-input";
import BrushupDialog from "@/components/brushup-dialog";
import ApiKeyDialog from "@/components/api-key-dialog";
import { hasCredentials } from "@/lib/llm-client";
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
import { clearState, loadState, saveState } from "@/lib/storage";

export default function Home() {
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [jobPosting, setJobPosting] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [hiringTrigger, setHiringTrigger] = useState(0);
  const [docType, setDocType] = useState<DocType>("resume");
  const [brushupField, setBrushupField] = useState<BrushupField | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(true);

  // 初回マウント時に localStorage から復元
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setResume(saved.resume);
      setJobPosting(saved.jobPosting);
      setJobAnalysis(saved.jobAnalysis ?? null);
    }
    setLoaded(true);

    // APIキー未設定なら、設定ダイアログを自動で開く
    const ready = hasCredentials();
    setApiKeySet(ready);
    if (!ready) setApiKeyOpen(true);
  }, []);

  // 変更を localStorage に自動保存（復元完了後のみ）
  useEffect(() => {
    if (!loaded) return;
    saveState({ resume, jobPosting, jobAnalysis });
  }, [resume, jobPosting, jobAnalysis, loaded]);

  function handleResumeUpdate(update: ResumeUpdate) {
    setResume((prev) => mergeUpdate(prev, update));
  }

  function handleBrushupApply(text: string) {
    if (!brushupField) return;
    setResume((prev) => ({ ...prev, [brushupField]: text }));
    setBrushupField(null);
  }

  function handleManualSave() {
    saveState({ resume, jobPosting, jobAnalysis });
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  function handleReset() {
    if (!window.confirm("入力内容をすべて削除して最初からやり直しますか？\nこの操作は取り消せません。")) return;
    const blank = emptyResume();
    setResume(blank);
    setJobPosting("");
    setJobAnalysis(null);
    clearState();
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* ヘッダー */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 print:hidden">
        <h1 className="text-sm font-bold text-slate-800">
          ResuMate <span className="font-normal text-slate-400">｜ AI履歴書・職務経歴書メーカー</span>
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setApiKeyOpen(true)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              apiKeySet
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            ⚙️ APIキー設定{apiKeySet ? "" : "（未設定）"}
          </button>
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
            onClick={handleManualSave}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              saveFlash
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {saveFlash ? "✓ 保存しました" : "一時保存"}
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            初期化
          </button>
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
              onNeedApiKey={() => setApiKeyOpen(true)}
            />
        </div>

        {/* 右: プレビュー */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-[820px] space-y-4 print:max-w-none">
            <JobPostingInput
                value={jobPosting}
                onChange={setJobPosting}
                onAnalysis={(a) => setJobAnalysis(a)}
                onResetAnalysis={() => { setJobAnalysis(null); setJobPosting(""); }}
                onStartHiring={() => setHiringTrigger((t) => t + 1)}
                onNeedApiKey={() => setApiKeyOpen(true)}
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

      {/* APIキー設定ダイアログ */}
      {apiKeyOpen && (
        <ApiKeyDialog
          firstTime={!apiKeySet}
          onClose={() => setApiKeyOpen(false)}
          onSaved={() => {
            setApiKeySet(hasCredentials());
            setApiKeyOpen(false);
          }}
        />
      )}
    </div>
  );
}
