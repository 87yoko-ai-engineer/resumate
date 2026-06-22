"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ToolUIPart,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import type {
  AdvisorSuggestion,
  JobAnalysis,
  ResumeData,
  ResumeUpdate,
} from "@/lib/resume-schema";
import { buildApplicantProfile } from "@/lib/resume-schema";
import { authHeaders, hasCredentials } from "@/lib/llm-client";
import SuggestionApproval, {
  type SuggestionState,
} from "@/components/suggestion-approval";
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

**① 求人情報を貼り付け（任意）**
応募先がある場合は、右側の「求人情報を貼り付け」で求人票やURLを分析できます。

---

**② 履歴書作成**
画像添付、直接入力または「AIアシスタント」のいずれかで経歴情報を入れてください。

その後、私がキャリアアドバイザーとして不足情報を1問ずつ確認し、改善案は承認してから書類に反映します。`;

interface ChatPanelProps {
  onResumeUpdate: (update: ResumeUpdate) => void;
  resume: ResumeData;
  jobPosting: string;
  jobAnalysis: JobAnalysis | null;
  hiringTrigger: number;
  jobConsultTrigger: number;
  onNeedApiKey: () => void;
}

export default function ChatPanel({
  onResumeUpdate,
  resume,
  jobPosting,
  jobAnalysis,
  hiringTrigger,
  jobConsultTrigger,
  onNeedApiKey,
}: ChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTriggerRef = useRef(0);
  const prevConsultRef = useRef(0);

  // チャット欄の音声入力（ブラウザの Web Speech API。Chrome等では音声が認識サービスに送られる）
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recordBaseRef = useRef("");

  // 重要: useChat は最初に作った transport を保持し続け、後から transport を差し替えても使わない
  // （内部で new Chat を一度だけ生成するため）。そのため transport は1回だけ作り（認証ヘッダ付与のみ）、
  // 求人・履歴書などの最新データは送信のたびに sendMessage の body で渡す（buildRequestBody）。
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, {
            ...options,
            headers: {
              ...(options?.headers as Record<string, string> | undefined),
              "content-type": "application/json",
              ...authHeaders(),
            },
          }),
      }),
    [],
  );

  // 送信のたびに付ける最新データ。AIへ渡すのはキャリア情報のみ（氏名・住所などの個人情報は含めない）。
  function buildRequestBody() {
    return {
      jobPosting,
      jobAnalysis,
      applicantProfile: buildApplicantProfile(resume),
    };
  }

  const { messages, sendMessage, status, error, addToolResult } = useChat({
    transport,
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
      sendMessage(
        { text: "[__HIRING_START__] ヒアリングを開始してください。" },
        { body: buildRequestBody() },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiringTrigger, sendMessage, onNeedApiKey, jobPosting, jobAnalysis, resume]);

  // 「求人だけで相談」開始トリガー（履歴書＝applicantProfileは絶対に送らない）
  useEffect(() => {
    if (jobConsultTrigger > 0 && jobConsultTrigger !== prevConsultRef.current) {
      prevConsultRef.current = jobConsultTrigger;
      if (!hasCredentials()) {
        onNeedApiKey();
        return;
      }
      sendMessage(
        { text: "[__HIRING_START_JOBONLY__] 求人情報だけをもとに相談を始めてください。" },
        { body: { jobPosting, jobAnalysis, applicantProfile: "" } },
      );
    }
  }, [jobConsultTrigger, sendMessage, onNeedApiKey, jobPosting, jobAnalysis]);

  const busy = status === "submitted" || status === "streaming";

  // 履歴書（キャリア情報）が入力済みか。ヒアリング開始チップの文言に使う。
  const hasProfile = buildApplicantProfile(resume).trim().length > 0;

  // 承認待ちの改善提案があるか（あれば、先に承認/却下してもらうため入力を一旦ロックする）
  const pendingApproval = messages.some((m) =>
    m.parts.some(
      (p) =>
        isToolUIPart(p) &&
        getToolName(p) === "proposeImprovement" &&
        (p.state === "input-available" || p.state === "input-streaming"),
    ),
  );
  const inputLocked = busy || pendingApproval;

  // AIの改善提案を承認 → その項目だけ履歴書に反映し、ツール結果を返して会話を継続させる。
  function approveSuggestion(toolCallId: string, suggestion: AdvisorSuggestion) {
    onResumeUpdate({
      [suggestion.targetField]: suggestion.suggestedText,
    } as ResumeUpdate);
    addToolResult({
      tool: "proposeImprovement",
      toolCallId,
      output: { approved: true, field: suggestion.targetField },
    });
  }

  // AIの改善提案を却下 → 履歴書は変更せず、却下の結果だけ返す。
  function rejectSuggestion(toolCallId: string) {
    addToolResult({
      tool: "proposeImprovement",
      toolCallId,
      output: { approved: false },
    });
  }

  // チャット欄の音声入力をトグルする。
  function toggleVoice() {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(
        "音声入力はお使いのブラウザに対応していません。\nGoogle Chrome または Microsoft Edge をご利用ください。",
      );
      return;
    }
    recordBaseRef.current = textareaRef.current?.value ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = "";
    recognition.onstart = () => setRecording(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      const base = recordBaseRef.current;
      const sep = base && finalText + interimText ? " " : "";
      if (textareaRef.current) {
        textareaRef.current.value = base + sep + finalText + interimText;
      }
    };
    recognition.onend = () => {
      setRecording(false);
      const base = recordBaseRef.current;
      const sep = base && finalText ? " " : "";
      if (textareaRef.current) textareaRef.current.value = base + sep + finalText;
    };
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  // 画面を離れるときは音声認識を止める
  useEffect(() => () => recognitionRef.current?.stop(), []);

  function submit() {
    const text = textareaRef.current?.value.trim();
    if (!text || inputLocked) return;
    if (!hasCredentials()) {
      onNeedApiKey();
      return;
    }
    sendMessage({ text }, { body: buildRequestBody() });
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
            // AIの改善提案（承認待ち／承認済み／却下）
            const proposals = m.parts.filter(
              (p) =>
                isToolUIPart(p) && getToolName(p) === "proposeImprovement",
            ) as ToolUIPart[];

            // ヒアリング開始メッセージを通知チップとして表示
            if (m.role === "user" && text.startsWith("[__HIRING_START")) {
              const jobOnly = text.startsWith("[__HIRING_START_JOBONLY__]");
              const chipLabel = jobOnly
                ? "求人分析を踏まえた相談を開始しました（履歴書は送っていません）"
                : jobAnalysis && hasProfile
                  ? "求人分析と経歴を踏まえたヒアリングを開始しました"
                  : jobAnalysis
                    ? "求人分析を踏まえた相談を開始しました"
                    : hasProfile
                      ? "経歴を踏まえたヒアリングを開始しました"
                      : "相談を開始しました";
              return (
                <div key={m.id} className="flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    {chipLabel}
                  </span>
                </div>
              );
            }

            const hasBubble = !!text || (reflected && m.role === "assistant");
            if (!hasBubble && proposals.length === 0) return null;

            return (
              <div key={m.id} className="flex flex-col gap-2">
                {hasBubble && (
                  <Message from={m.role}>
                    <MessageContent>
                      {text && <MessageResponse>{text}</MessageResponse>}
                      {reflected && m.role === "assistant" && (
                        <p className="text-xs font-medium text-emerald-600">
                          ✓ 書類に内容を反映しました
                        </p>
                      )}
                    </MessageContent>
                  </Message>
                )}

                {proposals.map((part) => {
                  if (part.state === "input-streaming") {
                    return (
                      <div
                        key={part.toolCallId}
                        className="rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-600"
                      >
                        AIが改善案を作成中…
                      </div>
                    );
                  }
                  const suggestion = part.input as AdvisorSuggestion | undefined;
                  if (!suggestion) return null;
                  let suggestionState: SuggestionState = "pending";
                  if (part.state === "output-available") {
                    const out = part.output as { approved?: boolean } | undefined;
                    suggestionState = out?.approved ? "approved" : "rejected";
                  } else if (
                    part.state === "output-error" ||
                    part.state === "output-denied"
                  ) {
                    suggestionState = "rejected";
                  }
                  return (
                    <SuggestionApproval
                      key={part.toolCallId}
                      suggestion={suggestion}
                      state={suggestionState}
                      onApprove={() =>
                        approveSuggestion(part.toolCallId, suggestion)
                      }
                      onReject={() => rejectSuggestion(part.toolCallId)}
                    />
                  );
                })}
              </div>
            );
          })}

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              <p className="font-medium">AIの応答に失敗しました。</p>
              <p className="mt-0.5">
                {error.message ||
                  "APIキーと、選んだモデルがそのキーで使えるかをご確認のうえ、少し時間をおいて再送信してください。"}
              </p>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-3 flex flex-col gap-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder={
              recording
                ? "話してください…"
                : pendingApproval
                  ? "上の改善案を承認または却下してから続けてください"
                  : "回答を入力（Enterで送信 / Shift+Enterで改行）"
            }
            disabled={inputLocked}
            onKeyDown={handleKeyDown}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 pr-10 text-sm min-h-[72px] max-h-48 focus-visible:outline-none focus-visible:border-ring placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleVoice}
            disabled={inputLocked}
            title={recording ? "音声入力を停止" : "音声入力を開始（日本語）"}
            className={`absolute right-2 top-2 rounded p-1.5 transition-colors disabled:opacity-40 ${
              recording
                ? "animate-pulse text-red-500 hover:text-red-700"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {recording
              ? "音声入力中… 氏名・住所などの個人情報は入れないでください"
              : pendingApproval
                ? "改善案の承認待ちです"
                : busy
                  ? "AIが応答中…"
                  : "🎤で音声入力できます（経歴・経験向け）"}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={inputLocked}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
