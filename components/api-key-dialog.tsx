"use client";

import { useState } from "react";
import {
  clearCredentials,
  loadCredentials,
  PROVIDER_KEY_URLS,
  PROVIDER_LABELS,
  saveCredentials,
  type Provider,
} from "@/lib/llm-client";

interface ApiKeyDialogProps {
  /** 初回（キー未設定）かどうか。文言を出し分ける。 */
  firstTime?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ApiKeyDialog({
  firstTime = false,
  onClose,
  onSaved,
}: ApiKeyDialogProps) {
  const existing = loadCredentials();
  const [provider, setProvider] = useState<Provider>(
    existing?.provider ?? "anthropic",
  );
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [show, setShow] = useState(false);

  function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    saveCredentials({ provider, apiKey: trimmed });
    onSaved();
  }

  function handleClear() {
    clearCredentials();
    setApiKey("");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-800">
            APIキー設定
          </h3>
          {!firstTime && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
              aria-label="閉じる"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-slate-600 leading-relaxed">
            {firstTime ? (
              <>
                このサービスは、あなた自身のAIのAPIキーを使って動きます。
                下記からプロバイダを選び、キーを入力してください。
                <br />
              </>
            ) : null}
            入力したキーは<strong>あなたのブラウザの中だけ</strong>に保存され、
            運営側のサーバーには保存されません。
          </div>

          {/* プロバイダ選択 */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              AIプロバイダ
            </p>
            <div className="flex gap-2">
              {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    provider === p
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* APIキー入力 */}
          <div>
            <label
              htmlFor="api-key-input"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              APIキー
            </label>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type={show ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === "anthropic" ? "sk-ant-..." : "sk-..."
                }
                autoComplete="off"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
              >
                {show ? "隠す" : "表示"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {PROVIDER_LABELS[provider]} のキーは
              <a
                href={PROVIDER_KEY_URLS[provider]}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 text-blue-600 underline"
              >
                こちら
              </a>
              から取得できます。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={handleClear}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            キーを削除
          </button>
          <div className="flex gap-2">
            {!firstTime && (
              <button
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              保存して使う
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
