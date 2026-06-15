"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useRef } from "react";
import type { JobAnalysis, ResumeUpdate } from "@/lib/resume-schema";
import { authHeaders, hasCredentials } from "@/lib/llm-client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

const STARTER_BASE = `こんにちは！転職活動の書類づくりをお手伝いします。

**① まず右側の黄色い欄に直接入力してください**
氏名・ふりがな・生年月日・性別・住所・電話番号・メールアドレス

---

**② ヒアリングの開始方法（どちらか一方でOK）**

📋 **応募したい求人がある場合**
→ 右上の「応募先の求人情報」に求人票または求人ページのURLを貼り付けて分析し、**「AIにヒアリングを始めてもらう」ボタン**を押してください。求人に合わせた質問をします。

💬 **求人が決まっていない場合**
→ 黄色い欄への入力が終わったら、**「始めます」とこのチャットに送ってください**。自己PR・志望動機・職務経歴を一緒に作ります。`;

interface ChatPanelProps {
  onResumeUpdate: (update: ResumeUpdate) => void;
  jobPosting: string;
  jobAnalysis: JobAnalysis | null;
  hiringTrigger: number;
  onNeedApiKey: () => void;
}

export default function ChatPanel({
  onResumeUpdate,
  jobPosting,
  jobAnalysis,
  hiringTrigger,
  onNeedApiKey,
}: ChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const jobPostingRef = useRef(jobPosting);
  const jobAnalysisRef = useRef(jobAnalysis);
  const prevTriggerRef = useRef(0);

  useEffect(() => {
    jobPostingRef.current = jobPosting;
  }, [jobPosting]);

  useEffect(() => {
    jobAnalysisRef.current = jobAnalysis;
  }, [jobAnalysis]);

  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
        const existing = options?.body ? JSON.parse(options.body as string) : {};
        return fetch(url, {
          ...options,
          headers: {
            ...(options?.headers as Record<string, string> | undefined),
            "content-type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            ...existing,
            jobPosting: jobPostingRef.current,
            jobAnalysis: jobAnalysisRef.current,
          }),
        });
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "updateResumeFields") {
        onResumeUpdate(toolCall.input as ResumeUpdate);
        addToolResult({
          tool: "updateResumeFields",
          toolCallId: toolCall.toolCallId,
          output: { ok: true },
        });
      }
    },
  });

  // ヒアリング開始トリガー
  useEffect(() => {
    if (hiringTrigger > 0 && hiringTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = hiringTrigger;
      if (!hasCredentials()) {
        onNeedApiKey();
        return;
      }
      sendMessage({ text: "[__HIRING_START__] ヒアリングを開始してください。" });
    }
  }, [hiringTrigger, sendMessage, onNeedApiKey]);

  const busy = status === "submitted" || status === "streaming";

  function submit() {
    const text = textareaRef.current?.value.trim();
    if (!text || busy) return;
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    sendMessage({ text });
    if (textareaRef.current) textareaRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">AIアシスタント</h2>
        <p className="text-xs text-muted-foreground">
          質問に答えると右側の書類に反映されます
        </p>
      </div>

      <Conversation className="min-h-0">
        <ConversationContent className="gap-4">
          <Message from="assistant">
            <MessageContent>
              <MessageResponse>{STARTER_BASE}</MessageResponse>
            </MessageContent>
          </Message>

          {messages.map((m) => {
            const text = m.parts
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("");
            const reflected = m.parts.some(
              (p) => p.type === "tool-updateResumeFields",
            );

            // ヒアリング開始メッセージを通知チップとして表示
            if (
              m.role === "user" &&
              text.startsWith("[__HIRING_START__]")
            ) {
              return (
                <div
                  key={m.id}
                  className="flex justify-center"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    求人分析に基づくヒアリングを開始しました
                  </span>
                </div>
              );
            }

            if (!text && !reflected) return null;
            return (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {text && <MessageResponse>{text}</MessageResponse>}
                  {reflected && m.role === "assistant" && (
                    <p className="text-xs font-medium text-emerald-600">
                      ✓ 書類に内容を反映しました
                    </p>
                  )}
                </MessageContent>
              </Message>
            );
          })}

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              AIの応答に失敗しました。右上の「⚙️ APIキー設定」で、
              <strong>APIキーが正しいか</strong>、
              <strong>選んだモデルがそのキーで使えるか</strong>をご確認のうえ、
              少し時間をおいて再送信してください。
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3 flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          placeholder="回答を入力（Enterで送信 / Shift+Enterで改行）"
          disabled={busy}
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm min-h-[72px] max-h-48 focus-visible:outline-none focus-visible:border-ring placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {busy ? "AIが応答中…" : "Shift+Enterで改行"}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
