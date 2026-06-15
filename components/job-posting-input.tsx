"use client";

import { useState } from "react";
import type { JobAnalysis } from "@/lib/resume-schema";
import { authHeaders, hasCredentials } from "@/lib/llm-client";

interface JobPostingInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalysis: (analysis: JobAnalysis) => void;
  onResetAnalysis: () => void;
  onStartHiring: () => void;
  onNeedApiKey: () => void;
  analysis: JobAnalysis | null;
}

type Tab = "url" | "text";
type UrlStep = "idle" | "fetching" | "analyzing" | "done" | "error";

export default function JobPostingInput({
  value,
  onChange,
  onAnalysis,
  onResetAnalysis,
  onStartHiring,
  onNeedApiKey,
  analysis,
}: JobPostingInputProps) {
  // 一番の機能なので、初期状態から開いて見せる
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("text");
  const [url, setUrl] = useState("");
  const [urlStep, setUrlStep] = useState<UrlStep>("idle");
  const [urlError, setUrlError] = useState("");
  const [textAnalyzing, setTextAnalyzing] = useState(false);
  const [textError, setTextError] = useState("");

  // アコーディオン開閉
  const [motivOpen, setMotivOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);

  async function analyzeText(jobText: string): Promise<void> {
    const res = await fetch("/api/analyze-job", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ jobText }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "分析に失敗しました。");
    }
    onAnalysis(data as JobAnalysis);
  }

  async function handleUrlFetch() {
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    setUrlError("");
    setUrlStep("fetching");
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ページの取得に失敗しました。");
      }
      const fetchedText: string = data.text;
      onChange(fetchedText);

      setUrlStep("analyzing");
      await analyzeText(fetchedText);
      setUrlStep("done");
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "エラーが発生しました。");
      setUrlStep("error");
    }
  }

  async function handleTextAnalyze() {
    if (!value.trim()) {
      setTextError("求人情報を入力してください。");
      return;
    }
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    setTextError("");
    setTextAnalyzing(true);
    try {
      await analyzeText(value);
    } catch (e) {
      setTextError(e instanceof Error ? e.message : "分析中にエラーが発生しました。");
    } finally {
      setTextAnalyzing(false);
    }
  }

  const hasValue = value.trim().length > 0 || analysis !== null;

  return (
    <div className="rounded-md border border-slate-200 bg-amber-50/60 print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700"
      >
        <span>
          📋 応募先の求人情報
          {hasValue && (
            <span className="ml-2 text-xs text-emerald-600">
              {analysis ? "分析済み" : "設定済み"}
            </span>
          )}
        </span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* タブ切替 */}
          <div className="flex rounded-md border border-slate-200 p-0.5 text-xs w-fit">
            <button
              onClick={() => setTab("text")}
              className={`rounded px-3 py-1 font-medium ${
                tab === "text"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              テキストを貼り付け
            </button>
            <button
              onClick={() => setTab("url")}
              className={`rounded px-3 py-1 font-medium ${
                tab === "url"
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              URLで読み込む
            </button>
          </div>

          {/* URLタブ */}
          {tab === "url" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                求人ページのURLを入力すると、自動でテキストを取得して分析します。
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={urlStep === "fetching" || urlStep === "analyzing"}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:opacity-50"
                />
                <button
                  onClick={handleUrlFetch}
                  disabled={
                    !url.trim() ||
                    urlStep === "fetching" ||
                    urlStep === "analyzing"
                  }
                  className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
                >
                  読み込んで分析
                </button>
              </div>

              {/* ステップ表示 */}
              {urlStep === "fetching" && (
                <p className="text-xs text-slate-500 animate-pulse">取得中...</p>
              )}
              {urlStep === "analyzing" && (
                <p className="text-xs text-slate-500 animate-pulse">分析中...</p>
              )}
              {urlStep === "done" && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-emerald-600">取得・分析が完了しました。</p>
                  {analysis && (
                    <button
                      onClick={onResetAnalysis}
                      className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      企業情報をリセット
                    </button>
                  )}
                </div>
              )}
              {urlStep === "error" && urlError && (
                <p className="text-xs text-red-600">{urlError}</p>
              )}
            </div>
          )}

          {/* テキストタブ */}
          {tab === "text" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                求人票や募集要項を貼り付けると、志望動機などのブラッシュアップが
                その企業・職種に合わせた内容になります。
              </p>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={5}
                placeholder="求人票の本文をここに貼り付け…"
                className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTextAnalyze}
                  disabled={textAnalyzing || !value.trim()}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {textAnalyzing ? "分析中..." : "この内容を分析する"}
                </button>
                {analysis && (
                  <button
                    onClick={onResetAnalysis}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    企業情報をリセット
                  </button>
                )}
              </div>
              {textError && (
                <p className="text-xs text-red-600">{textError}</p>
              )}
            </div>
          )}

          {/* 分析結果エリア */}
          {analysis && (
            <div className="border-t border-slate-200 pt-3 space-y-3">
              {analysis.companyName && (
                <p className="text-sm font-semibold text-slate-700">
                  {analysis.companyName}
                </p>
              )}

              {/* 求める人材像 */}
              <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  📊 求める人材像
                </p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">
                  {analysis.requirements}
                </p>
              </div>

              {/* 志望動機の参照例 アコーディオン */}
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setMotivOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100"
                >
                  <span>📝 志望動機の参照例</span>
                  <span className="text-slate-400">{motivOpen ? "−" : "+"}</span>
                </button>
                {motivOpen && (
                  <div className="px-3 py-2">
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">
                      {analysis.motivationDraft}
                    </p>
                  </div>
                )}
              </div>

              {/* 自己PRの参照例 アコーディオン */}
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setPrOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100"
                >
                  <span>📝 自己PRの参照例</span>
                  <span className="text-slate-400">{prOpen ? "−" : "+"}</span>
                </button>
                {prOpen && (
                  <div className="px-3 py-2">
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">
                      {analysis.selfPRDraft}
                    </p>
                  </div>
                )}
              </div>

              {/* ヒアリング項目 */}
              <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  ヒアリング項目
                </p>
                <ol className="space-y-1 list-decimal list-inside">
                  {analysis.questions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      {q}
                    </li>
                  ))}
                </ol>
              </div>

              {/* ヒアリング開始ボタン */}
              <button
                onClick={onStartHiring}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                🎤 AIにヒアリングを始めてもらう
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
