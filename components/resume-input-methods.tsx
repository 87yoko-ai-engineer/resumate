"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileUp, Keyboard, Sparkles } from "lucide-react";
import { hasCredentials } from "@/lib/llm-client";
import {
  blobToOcrFile,
  extractFromImages,
  fileToOcrFile,
  type OcrFile,
} from "@/lib/ocr-client";
import type { OcrExtraction } from "@/lib/resume-schema";
import OcrImportDialog from "@/components/ocr-import-dialog";

interface ResumeInputMethodsProps {
  onDirectInput: () => void;
  onStartAdvisor: () => void;
  hasJobAnalysis: boolean;
  onApplyOcr: (extraction: OcrExtraction) => void;
  onNeedApiKey: () => void;
}

export default function ResumeInputMethods({
  onDirectInput,
  onStartAdvisor,
  hasJobAnalysis,
  onApplyOcr,
  onNeedApiKey,
}: ResumeInputMethodsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrExtraction | null>(null);

  // 「画像を選んで読み取る」ボタン。APIキー未設定なら設定ダイアログへ誘導。
  function pickImages() {
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    setOcrError(null);
    fileInputRef.current?.click();
  }

  // 画像（ファイル選択／クリップボード）を本人のAIへ送り、読み取り結果を確認ダイアログに表示する。
  const runOcr = useCallback(async (ocrFiles: OcrFile[]) => {
    if (ocrFiles.length === 0) return;
    if (ocrFiles.length > 4) {
      setOcrError("画像は一度に4枚までです。");
      return;
    }
    setOcrBusy(true);
    setOcrError(null);
    try {
      const extraction = await extractFromImages(ocrFiles);
      setOcrResult(extraction);
    } catch (err) {
      setOcrError(
        err instanceof Error ? err.message : "画像の読み取りに失敗しました。",
      );
    } finally {
      setOcrBusy(false);
    }
  }, []);

  // 「画像を選んで読み取る」：ファイル選択ダイアログから画像を読み取る。
  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    e.target.value = ""; // 同じ画像を選び直せるようにリセット
    const ocrFiles = await Promise.all(files.map(fileToOcrFile));
    await runOcr(ocrFiles);
  }

  // 「クリップボードから貼り付け」：スクショ（Win+Shift+S など）を直接読み取る。
  async function pasteFromClipboard() {
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    setOcrError(null);
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setOcrError(
        "このブラウザはクリップボードからの貼り付けに対応していません。Chrome / Edge をご利用ください。",
      );
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const ocrFiles: OcrFile[] = [];
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          ocrFiles.push(await blobToOcrFile(blob));
        }
      }
      if (ocrFiles.length === 0) {
        setOcrError(
          "クリップボードに画像がありません。先にスクリーンショットを撮ってから「クリップボードから貼り付け」を押してください。",
        );
        return;
      }
      await runOcr(ocrFiles);
    } catch {
      setOcrError(
        "クリップボードの読み取りに失敗しました。ブラウザに貼り付けの許可を出してからお試しください。",
      );
    }
  }

  // Ctrl+V（スクショの貼り付け）でも読み取れるようにする。
  // クリップボードに画像があるときだけ処理し、テキストの貼り付けは通常どおり邪魔しない。
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length === 0) return; // 画像でなければ通常の貼り付けに任せる
      e.preventDefault();
      if (ocrBusy) return;
      if (!hasCredentials()) {
        onNeedApiKey();
        return;
      }
      Promise.all(images.map(fileToOcrFile))
        .then(runOcr)
        .catch(() => setOcrError("画像の読み取りに失敗しました。"));
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ocrBusy, onNeedApiKey, runOcr]);

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

      <div className="grid gap-3 md:grid-cols-2">
        <InputMethodCard
          icon={<FileUp className="size-5" />}
          title="履歴書・職務経歴書を読み取り"
          description="スクリーンショットを貼り付けるか、スマホで撮影して、氏名・住所などの個人情報を除いたキャリア情報（学歴・職歴・資格・職務経歴・職務要約・スキル・自己PR・志望動機）をAIが読み取ります。読み取った内容は、反映前にご自身で確認・修正できます。"
          notice="氏名・住所・生年月日・電話・メールなどの個人情報が映らないようにしてください（必要な部分だけを写す／紙などで隠す）。画像はあなたご自身のAIに送られます。"
          actionLabel={ocrBusy ? "読み取り中…" : "スクリーンショットを貼り付け"}
          onAction={pasteFromClipboard}
          secondaryLabel="スマホ・カメラで撮影（PCではファイル選択）"
          onSecondaryAction={pickImages}
          status="PCはスクショを Ctrl+V でも読み取れます（Win+Shift+S → Ctrl+V）"
          disabled={ocrBusy}
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

      {ocrError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-600">
          {ocrError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

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

      {ocrResult && (
        <OcrImportDialog
          extraction={ocrResult}
          onApply={(edited) => {
            onApplyOcr(edited);
            setOcrResult(null);
          }}
          onClose={() => setOcrResult(null)}
        />
      )}
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
  secondaryLabel,
  onSecondaryAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  notice?: string;
  actionLabel: string;
  status: string;
  disabled?: boolean;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
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
      <div className="mt-auto flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLabel}
        </button>
        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={disabled}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
