"use client";

import { useId, useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Mic, MicOff, Camera, Upload } from "lucide-react";
import {
  BRUSHUP_FIELDS,
  newId,
  type BrushupField,
  type DocType,
  type ResumeBasic,
  type ResumeData,
} from "@/lib/resume-schema";

interface ResumePreviewProps {
  resume: ResumeData;
  docType: DocType;
  onChange: (resume: ResumeData) => void;
  onBrushup: (field: BrushupField) => void;
}

// 「現在日付」はクライアントのローカル時刻で表示する。
// モジュール読み込み時に new Date() で計算すると、サーバー(UTC)とブラウザ(JST)で
// 日付がずれてハイドレーションエラーになる。useSyncExternalStore を使い、
// サーバー時は空文字、ハイドレーション後にクライアントの日付へ安全に切り替える。
const subscribeNoop = () => () => {};

function TodayLabel() {
  const label = useSyncExternalStore(
    subscribeNoop,
    () => {
      const d = new Date();
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 現在`;
    },
    () => "",
  );
  return <>{label}</>;
}

export default function ResumePreview({
  resume,
  docType,
  onChange,
  onBrushup,
}: ResumePreviewProps) {
  const update = (patch: Partial<ResumeData>) => onChange({ ...resume, ...patch });
  const updateBasic = (patch: Partial<ResumeBasic>) =>
    onChange({ ...resume, basic: { ...resume.basic, ...patch } });

  return (
    <div className="print-area mx-auto max-w-[820px] bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      {docType === "resume" ? (
        <ResumeDoc
          resume={resume}
          update={update}
          updateBasic={updateBasic}
          onBrushup={onBrushup}
        />
      ) : (
        <CvDoc resume={resume} update={update} onBrushup={onBrushup} />
      )}
    </div>
  );
}

/* ---------- 履歴書 ---------- */

function ResumeDoc({
  resume,
  update,
  updateBasic,
  onBrushup,
}: {
  resume: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  updateBasic: (patch: Partial<ResumeBasic>) => void;
  onBrushup: (field: BrushupField) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-widest">履歴書</h1>
        <span className="text-xs text-slate-500"><TodayLabel /></span>
      </div>

      {/* 自己入力エリア：基本情報 */}
      <div className="space-y-3 rounded-lg p-3 print:rounded-none print:p-0">
        {/* 氏名・生年月日 ＋ 写真 */}
        <div className="flex items-stretch gap-3">
          <table className="min-w-0 flex-1 border border-slate-400 text-sm">
            <tbody>
              <tr>
                <Th>ふりがな</Th>
                <Td colSpan={3}>
                  <Line
                    value={resume.basic.kana}
                    onChange={(v) => updateBasic({ kana: v })}
                    placeholder="やまだ たろう"
                  />
                </Td>
              </tr>
              <tr>
                <Th>氏名</Th>
                <Td colSpan={3}>
                  <Line
                    value={resume.basic.name}
                    onChange={(v) => updateBasic({ name: v })}
                    placeholder="山田 太郎"
                    className="text-lg font-semibold"
                  />
                </Td>
              </tr>
              <tr>
                <Th>生年月日</Th>
                <Td>
                  <BirthDateSelect
                    value={resume.basic.birthDate}
                    onChange={(v) => updateBasic({ birthDate: v })}
                  />
                </Td>
                <Th>性別</Th>
                <Td>
                  <GenderSelect
                    value={resume.basic.gender}
                    onChange={(v) => updateBasic({ gender: v })}
                  />
                </Td>
              </tr>
            </tbody>
          </table>
          <PhotoUpload
            value={resume.basic.photo}
            onChange={(v) => updateBasic({ photo: v ?? undefined })}
          />
        </div>

        {/* 連絡先 */}
        <table className="w-full border border-slate-400 text-sm">
          <tbody>
            <tr>
              <Th>現住所</Th>
              <Td colSpan={3}>
                <AddressInput
                  zipcode={resume.basic.zipcode ?? ""}
                  address={resume.basic.address}
                  onZipcodeChange={(v) => updateBasic({ zipcode: v })}
                  onAddressChange={(v) => updateBasic({ address: v })}
                />
              </Td>
            </tr>
            <tr>
              <Th>電話</Th>
              <Td>
                <Line
                  value={resume.basic.phone}
                  onChange={(v) => updateBasic({ phone: v })}
                  placeholder="090-1234-5678"
                />
              </Td>
              <Th>メール</Th>
              <Td>
                <Line
                  value={resume.basic.email}
                  onChange={(v) => updateBasic({ email: v })}
                  placeholder="taro@example.com"
                />
              </Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 学歴・職歴 */}
      <Section title="学歴・職歴">
        <table className="w-full border border-slate-400 text-sm">
          <thead>
            <tr>
              <Th className="w-16">年</Th>
              <Th className="w-16">月</Th>
              <Th>学歴・職歴</Th>
              <th className="w-8 border border-slate-400 bg-slate-50 print:hidden" />
            </tr>
          </thead>
          <tbody>
            <RowGroup label="学歴">
              {resume.education.map((e) => (
                <DateRow
                  key={e.id}
                  year={e.year}
                  month={e.month}
                  text={e.description}
                  onChange={(patch) =>
                    update({
                      education: resume.education.map((x) =>
                        x.id === e.id ? { ...x, ...patch } : x,
                      ),
                    })
                  }
                  onRemove={() =>
                    update({
                      education: resume.education.filter((x) => x.id !== e.id),
                    })
                  }
                  textPlaceholder="〇〇大学〇〇学部 卒業"
                />
              ))}
            </RowGroup>
            <RowGroup label="職歴">
              {resume.workHistory.map((w) => (
                <DateRow
                  key={w.id}
                  year={w.year}
                  month={w.month}
                  text={w.description}
                  onChange={(patch) =>
                    update({
                      workHistory: resume.workHistory.map((x) =>
                        x.id === w.id ? { ...x, ...patch } : x,
                      ),
                    })
                  }
                  onRemove={() =>
                    update({
                      workHistory: resume.workHistory.filter(
                        (x) => x.id !== w.id,
                      ),
                    })
                  }
                  textPlaceholder="株式会社〇〇 入社"
                />
              ))}
            </RowGroup>
          </tbody>
        </table>
        <div className="flex gap-2 print:hidden">
          <AddButton
            onClick={() =>
              update({
                education: [
                  ...resume.education,
                  { id: newId(), year: "", month: "", description: "" },
                ],
              })
            }
          >
            学歴を追加
          </AddButton>
          <AddButton
            onClick={() =>
              update({
                workHistory: [
                  ...resume.workHistory,
                  { id: newId(), year: "", month: "", description: "" },
                ],
              })
            }
          >
            職歴を追加
          </AddButton>
        </div>
      </Section>

      {/* 自己入力エリア：免許・資格 */}
      <div className="rounded-lg p-3 print:rounded-none print:p-0">
        <Section title="免許・資格">
        <table className="w-full border border-slate-400 text-sm">
          <thead>
            <tr>
              <Th className="w-16">年</Th>
              <Th className="w-16">月</Th>
              <Th>免許・資格</Th>
              <th className="w-8 border border-slate-400 bg-slate-50 print:hidden" />
            </tr>
          </thead>
          <tbody>
            {resume.licenses.length === 0 && (
              <tr>
                <Td colSpan={4} className="text-center text-slate-400">
                  （未入力）
                </Td>
              </tr>
            )}
            {resume.licenses.map((l) => (
              <DateRow
                key={l.id}
                year={l.year}
                month={l.month}
                text={l.name}
                onChange={(patch) =>
                  update({
                    licenses: resume.licenses.map((x) =>
                      x.id === l.id
                        ? {
                            ...x,
                            year: patch.year ?? x.year,
                            month: patch.month ?? x.month,
                            name: patch.description ?? x.name,
                          }
                        : x,
                    ),
                  })
                }
                onRemove={() =>
                  update({
                    licenses: resume.licenses.filter((x) => x.id !== l.id),
                  })
                }
                textPlaceholder="普通自動車第一種運転免許"
              />
            ))}
          </tbody>
        </table>
        <div className="print:hidden">
          <AddButton
            onClick={() =>
              update({
                licenses: [
                  ...resume.licenses,
                  { id: newId(), year: "", month: "", name: "" },
                ],
              })
            }
          >
            免許・資格を追加
          </AddButton>
        </div>
        </Section>
      </div>

      {/* 志望の動機 */}
      <Section title="志望の動機" brushupField="motivation" onBrushup={onBrushup}>
        <Block
          value={resume.motivation}
          onChange={(v) => update({ motivation: v })}
          placeholder="志望動機を入力、またはチャットで話した内容がここに反映されます。"
        />
      </Section>

      {/* 自己PR */}
      <Section title="自己PR" brushupField="selfPR" onBrushup={onBrushup}>
        <Block
          value={resume.selfPR}
          onChange={(v) => update({ selfPR: v })}
          placeholder="自己PRを入力、またはチャットで話した内容がここに反映されます。"
        />
      </Section>
    </div>
  );
}

/* ---------- 職務経歴書 ---------- */

function CvDoc({
  resume,
  update,
  onBrushup,
}: {
  resume: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  onBrushup: (field: BrushupField) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-widest">職務経歴書</h1>
      </div>
      <div className="flex justify-end text-sm">
        <span>
          <TodayLabel />　氏名：
          <span className="font-semibold">
            {resume.basic.name || "（未入力）"}
          </span>
        </span>
      </div>

      <Section title="職務要約" brushupField="careerSummary" onBrushup={onBrushup}>
        <Block
          value={resume.careerSummary}
          onChange={(v) => update({ careerSummary: v })}
          placeholder="これまでの職務経歴の要約。チャットで話した内容も反映されます。"
        />
      </Section>

      <Section title="職務経歴">
        <div className="space-y-3">
          {resume.careers.length === 0 && (
            <p className="text-sm text-slate-400">（未入力）</p>
          )}
          {resume.careers.map((c) => (
            <div
              key={c.id}
              className="rounded border border-slate-300 p-3 print:border-slate-400"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Line
                  value={c.company}
                  onChange={(v) =>
                    update({
                      careers: resume.careers.map((x) =>
                        x.id === c.id ? { ...x, company: v } : x,
                      ),
                    })
                  }
                  placeholder="株式会社〇〇"
                  className="font-semibold"
                />
                <button
                  onClick={() =>
                    update({
                      careers: resume.careers.filter((x) => x.id !== c.id),
                    })
                  }
                  className="shrink-0 text-xs text-red-500 print:hidden"
                >
                  削除
                </button>
              </div>
              <div className="mb-1">
                <PeriodSelect
                  value={c.period}
                  onChange={(v) =>
                    update({
                      careers: resume.careers.map((x) =>
                        x.id === c.id ? { ...x, period: v } : x,
                      ),
                    })
                  }
                />
              </div>
              <div className="mb-1">
                <Line
                  value={c.role}
                  onChange={(v) =>
                    update({
                      careers: resume.careers.map((x) =>
                        x.id === c.id ? { ...x, role: v } : x,
                      ),
                    })
                  }
                  placeholder="役職・担当業務"
                  className="text-sm font-medium"
                />
              </div>
              <Block
                value={c.description}
                onChange={(v) =>
                  update({
                    careers: resume.careers.map((x) =>
                      x.id === c.id ? { ...x, description: v } : x,
                    ),
                  })
                }
                placeholder="具体的な業務内容・実績"
              />
            </div>
          ))}
        </div>
        <div className="print:hidden">
          <AddButton
            onClick={() =>
              update({
                careers: [
                  ...resume.careers,
                  {
                    id: newId(),
                    company: "",
                    period: "",
                    role: "",
                    description: "",
                  },
                ],
              })
            }
          >
            職務経歴を追加
          </AddButton>
        </div>
      </Section>

      <Section title="活かせる経験・知識・スキル">
        <Block
          value={resume.skills}
          onChange={(v) => update({ skills: v })}
          placeholder="活かせる経験・知識・スキルを入力。"
        />
      </Section>

      <Section title="自己PR" brushupField="selfPR" onBrushup={onBrushup}>
        <Block
          value={resume.selfPR}
          onChange={(v) => update({ selfPR: v })}
          placeholder="自己PRを入力、またはチャットで話した内容がここに反映されます。"
        />
      </Section>
    </div>
  );
}

/* ---------- 共通パーツ ---------- */

function Section({
  title,
  brushupField,
  onBrushup,
  children,
}: {
  title: string;
  brushupField?: BrushupField;
  onBrushup?: (field: BrushupField) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b-2 border-slate-700 pb-1">
        <h2 className="text-base font-bold">{title}</h2>
        {brushupField && onBrushup && (
          <button
            onClick={() => onBrushup(brushupField)}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 print:hidden"
          >
            ✨ {BRUSHUP_FIELDS[brushupField]}をAIブラッシュアップ
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Th({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={`border border-slate-400 bg-slate-50 px-2 py-1.5 text-left align-top font-medium ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-400 px-2 py-1.5 align-top ${className}`}
    >
      {children}
    </td>
  );
}

function RowGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <>
      <tr>
        <Td colSpan={4} className="bg-slate-50 text-center text-xs font-semibold">
          {label}
        </Td>
      </tr>
      {hasChildren ? (
        children
      ) : (
        <tr>
          <Td colSpan={4} className="text-center text-slate-400">
            （未入力）
          </Td>
        </tr>
      )}
    </>
  );
}

function DateRow({
  year,
  month,
  text,
  onChange,
  onRemove,
  textPlaceholder,
}: {
  year: string;
  month: string;
  text: string;
  onChange: (patch: { year?: string; month?: string; description?: string }) => void;
  onRemove: () => void;
  textPlaceholder: string;
}) {
  return (
    <tr>
      <Td>
        <YearSelect value={year} onChange={(v) => onChange({ year: v })} />
      </Td>
      <Td>
        <MonthSelect value={month} onChange={(v) => onChange({ month: v })} />
      </Td>
      <Td>
        <Line
          value={text}
          onChange={(v) => onChange({ description: v })}
          placeholder={textPlaceholder}
        />
      </Td>
      <td className="border border-slate-400 text-center print:hidden">
        <button
          onClick={onRemove}
          className="px-1 text-xs text-red-500"
          aria-label="削除"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function PhotoUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-[120px] w-[90px] flex-col items-center justify-center overflow-hidden rounded border-2 border-dashed border-slate-400 bg-slate-50 transition-colors hover:border-slate-500 hover:bg-slate-100 print:border-solid print:border-slate-400"
        title="クリックして写真をアップロード"
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="証明写真" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 print:hidden">
              <Camera className="size-5 text-white" />
              <span className="mt-1 text-[10px] text-white">変更</span>
            </div>
          </>
        ) : (
          <>
            <Upload className="size-6 text-slate-400 group-hover:text-slate-600 print:hidden" />
            <span className="mt-1 text-[10px] text-slate-400 print:hidden">写真を追加</span>
            <span className="hidden text-xs text-slate-400 print:block">写真</span>
          </>
        )}
      </button>
      <span className="text-[10px] text-slate-400 print:hidden">3cm × 4cm 推奨</span>
      <button
        type="button"
        onClick={() => setCameraOpen(true)}
        className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:underline print:hidden"
      >
        <Camera className="size-3" />
        カメラで撮影
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-[10px] text-red-400 hover:underline print:hidden"
        >
          写真を削除
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {cameraOpen && (
        <CameraModal
          onCapture={(dataUrl) => { onChange(dataUrl); setCameraOpen(false); }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

const BG_OPTIONS = [
  { label: "白", value: "#ffffff" },
  { label: "青", value: "#4a90d9" },
  { label: "グレー", value: "#9ca3af" },
];

function CameraModal({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tmpCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [bgColor, setBgColor] = useState("#4a90d9");
  const [beautyOn, setBeautyOn] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segRef = useRef<any>(null);
  const activeRef = useRef(true);
  const processingRef = useRef(false);
  const bgColorRef = useRef(bgColor);
  const beautyRef = useRef(beautyOn);

  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(() => { beautyRef.current = beautyOn; }, [beautyOn]);

  useEffect(() => {
    activeRef.current = true;
    tmpCanvasRef.current = document.createElement("canvas");
    maskCanvasRef.current = document.createElement("canvas");

    const init = async () => {
      const { SelfieSegmentation } = await import("@mediapipe/selfie_segmentation");
      if (!activeRef.current) return;

      const seg = new SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      seg.setOptions({ modelSelection: 1, selfieMode: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seg.onResults((results: any) => {
        if (!activeRef.current) return;
        const canvas = canvasRef.current;
        const tmp = tmpCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !tmp || !maskCanvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        // マスクをぼかして輪郭をなめらかにする
        maskCanvas.width = w;
        maskCanvas.height = h;
        const maskCtx = maskCanvas.getContext("2d")!;
        maskCtx.clearRect(0, 0, w, h);
        // ぼかしで輪郭を外側に拡張 → コントラストで締めることで
        // 髪の毛を含めつつ背景の染み込みを抑える
        maskCtx.filter = "blur(3px) contrast(6)";
        maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
        maskCtx.filter = "none";

        // 人物だけを切り抜いて合成
        tmp.width = w;
        tmp.height = h;
        const tmpCtx = tmp.getContext("2d")!;
        tmpCtx.clearRect(0, 0, w, h);
        if (beautyRef.current) {
          tmpCtx.filter = "blur(0.8px) brightness(1.08) contrast(0.92) saturate(1.1)";
        }
        tmpCtx.drawImage(results.image, 0, 0, w, h);
        tmpCtx.filter = "none";
        tmpCtx.globalCompositeOperation = "destination-in";
        tmpCtx.drawImage(maskCanvas, 0, 0, w, h);

        // 背景色 → 人物の順で描画
        ctx.fillStyle = bgColorRef.current;
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(tmp, 0, 0);

        processingRef.current = false;
      });

      segRef.current = seg;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((resolve) => { video.onloadeddata = () => resolve(); });
      if (!activeRef.current) return;

      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      setReady(true);

      const loop = async () => {
        if (!activeRef.current) return;
        if (!processingRef.current && segRef.current && video.readyState === 4) {
          processingRef.current = true;
          await segRef.current.send({ image: video });
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };

    init().catch(() => {
      if (activeRef.current) {
        setError("カメラへのアクセスが許可されていません。\nブラウザの設定でカメラを許可してください。");
      }
    });

    return () => {
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      segRef.current?.close();
    };
  }, []);

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:hidden">
      <div className="flex w-[420px] flex-col gap-4 rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">カメラで撮影</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="閉じる">
            ✕
          </button>
        </div>

        {error ? (
          <p className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "4/3" }}>
            {/* 非表示の映像ソース */}
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full opacity-0" />
            {/* 合成済みキャンバス */}
            <canvas ref={canvasRef} className="h-full w-full object-cover" />
            {/* ガイドライン */}
            {showGuide && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-white/50" />
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/50" />
                <div
                  className="absolute rounded-full border-2 border-dashed border-white/70"
                  style={{ left: "28%", right: "28%", top: "6%", bottom: "28%" }}
                />
              </div>
            )}
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="animate-pulse text-xs text-white">カメラ起動中…</span>
              </div>
            )}
          </div>
        )}

        {/* 背景色 */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-700">背景色</p>
          <div className="flex gap-2">
            {BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBgColor(opt.value)}
                title={opt.label}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                  bgColor === opt.value ? "scale-110 border-slate-700" : "border-slate-300"
                }`}
                style={{ backgroundColor: opt.value }}
              >
                {bgColor === opt.value && (
                  <span className="text-xs" style={{ color: opt.value === "#ffffff" ? "#334155" : "#fff" }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* オプション */}
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={beautyOn} onChange={(e) => setBeautyOn(e.target.checked)} className="rounded" />
            ✨ 美肌フィルター
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} className="rounded" />
            ガイドラインを表示
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            撮影する
          </button>
        </div>
      </div>
    </div>
  );
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
    >
      ＋ {children}
    </button>
  );
}

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from(
  { length: CURRENT_YEAR - 15 - 1935 + 1 },
  (_, i) => CURRENT_YEAR - 15 - i,
);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
// 学歴・職歴・資格の「年」リスト（卒業見込み等で翌年も選べるよう +1 まで）。誕生年(BIRTH_YEARS)とは別。
const HISTORY_YEARS = Array.from(
  { length: CURRENT_YEAR + 1 - 1950 + 1 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

const SELECT_CLASS =
  "rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-amber-50/40 print:border-transparent";

export function BirthDateSelect({
  value,
  onChange,
  selectClassName = SELECT_CLASS,
}: {
  value: string;
  onChange: (v: string) => void;
  selectClassName?: string;
}) {
  const parse = (v: string) => {
    const m = v.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    return { y: m?.[1] ?? "", mo: m?.[2] ?? "", d: m?.[3] ?? "" };
  };
  const init = parse(value);
  const [year, setYear] = useState(init.y);
  const [month, setMonth] = useState(init.mo);
  const [day, setDay] = useState(init.d);
  const prevRef = useRef(value);
  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value;
      const { y, mo, d } = parse(value);
      setYear(y);
      setMonth(mo);
      setDay(d);
    }
  }, [value]);
  const commit = (y: string, mo: string, d: string) => {
    if (y && mo && d) onChange(`${y}年${parseInt(mo)}月${parseInt(d)}日`);
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <select
        value={year}
        onChange={(e) => { setYear(e.target.value); commit(e.target.value, month, day); }}
        className={selectClassName}
      >
        <option value="">年</option>
        {BIRTH_YEARS.map((y) => (
          <option key={y} value={String(y)}>{y}年</option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => { setMonth(e.target.value); commit(year, e.target.value, day); }}
        className={selectClassName}
      >
        <option value="">月</option>
        {MONTHS.map((m) => (
          <option key={m} value={String(m)}>{m}月</option>
        ))}
      </select>
      <select
        value={day}
        onChange={(e) => { setDay(e.target.value); commit(year, month, e.target.value); }}
        className={selectClassName}
      >
        <option value="">日</option>
        {DAYS.map((d) => (
          <option key={d} value={String(d)}>{d}日</option>
        ))}
      </select>
    </div>
  );
}

// 学歴・職歴・資格の「年」プルダウン（再利用可能）。既存値が範囲外でもそのまま表示できるよう補う。
export function YearSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const v = value.trim();
  const inList = HISTORY_YEARS.some((y) => String(y) === v);
  return (
    <select
      value={v}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? `${SELECT_CLASS} w-full`}
    >
      <option value="">年</option>
      {v && !inList && <option value={v}>{v}</option>}
      {HISTORY_YEARS.map((y) => (
        <option key={y} value={String(y)}>{y}</option>
      ))}
    </select>
  );
}

// 学歴・職歴・資格の「月」プルダウン（再利用可能）。"04" のような表記も "4" として表示。
export function MonthSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const raw = value.trim();
  const norm = /^\d{1,2}$/.test(raw) ? String(parseInt(raw, 10)) : raw;
  const inList = MONTHS.some((m) => String(m) === norm);
  return (
    <select
      value={norm}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? `${SELECT_CLASS} w-full`}
    >
      <option value="">月</option>
      {norm && !inList && <option value={norm}>{norm}</option>}
      {MONTHS.map((m) => (
        <option key={m} value={String(m)}>{m}</option>
      ))}
    </select>
  );
}

// 職務経歴の「在籍期間」をプルダウンで選ぶ（開始〜終了。在職中なら「現在」）。
// データは従来どおり1つの文字列（例: 2020年4月〜2023年3月）として保持する。
export function PeriodSelect({
  value,
  onChange,
  selectClassName = SELECT_CLASS,
}: {
  value: string;
  onChange: (v: string) => void;
  selectClassName?: string;
}) {
  const parse = (v: string) => {
    const ms = [...v.matchAll(/(\d{4})\s*年\s*(\d{1,2})\s*月/g)];
    const ongoing = /現在|在職/.test(v);
    return {
      sy: ms[0]?.[1] ?? "",
      sm: ms[0]?.[2] ?? "",
      ey: ongoing ? "" : ms[1]?.[1] ?? "",
      em: ongoing ? "" : ms[1]?.[2] ?? "",
      ongoing,
    };
  };
  const init = parse(value);
  const [sy, setSy] = useState(init.sy);
  const [sm, setSm] = useState(init.sm);
  const [ey, setEy] = useState(init.ey);
  const [em, setEm] = useState(init.em);
  const [ongoing, setOngoing] = useState(init.ongoing);
  const prevRef = useRef(value);
  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value;
      const p = parse(value);
      setSy(p.sy);
      setSm(p.sm);
      setEy(p.ey);
      setEm(p.em);
      setOngoing(p.ongoing);
    }
  }, [value]);

  const commit = (
    nsy: string,
    nsm: string,
    ney: string,
    nem: string,
    nOngoing: boolean,
  ) => {
    const start = nsy && nsm ? `${nsy}年${parseInt(nsm, 10)}月` : "";
    let out: string;
    if (nOngoing) {
      out = start ? `${start}〜現在` : "";
    } else {
      const end = ney && nem ? `${ney}年${parseInt(nem, 10)}月` : "";
      out = start && end ? `${start}〜${end}` : start ? `${start}〜` : "";
    }
    prevRef.current = out;
    onChange(out);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 text-xs text-slate-600">
      <YearSelect
        value={sy}
        onChange={(v) => { setSy(v); commit(v, sm, ey, em, ongoing); }}
        className={selectClassName}
      />
      <MonthSelect
        value={sm}
        onChange={(v) => { setSm(v); commit(sy, v, ey, em, ongoing); }}
        className={selectClassName}
      />
      <span className="px-1">〜</span>
      {ongoing ? (
        <span className="font-medium text-slate-700">現在</span>
      ) : (
        <>
          <YearSelect
            value={ey}
            onChange={(v) => { setEy(v); commit(sy, sm, v, em, ongoing); }}
            className={selectClassName}
          />
          <MonthSelect
            value={em}
            onChange={(v) => { setEm(v); commit(sy, sm, ey, v, ongoing); }}
            className={selectClassName}
          />
        </>
      )}
      <label className="ml-2 inline-flex items-center gap-1 print:hidden">
        <input
          type="checkbox"
          checked={ongoing}
          onChange={(e) => { setOngoing(e.target.checked); commit(sy, sm, ey, em, e.target.checked); }}
        />
        現在（在職中）
      </label>
    </div>
  );
}

function GenderSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
      <option value="">選択</option>
      <option value="男">男</option>
      <option value="女">女</option>
      <option value="その他">その他</option>
    </select>
  );
}

function AddressInput({
  zipcode,
  address,
  onZipcodeChange,
  onAddressChange,
}: {
  zipcode: string;
  address: string;
  onZipcodeChange: (v: string) => void;
  onAddressChange: (v: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (v: string) => {
    setSuggestion(null);
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 7) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/zipcode?zip=${digits}`);
      const data = await res.json();
      if (data.results?.[0]) {
        const r = data.results[0];
        setSuggestion(r.address1 + r.address2 + r.address3);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const lineClass =
    "w-full rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-amber-50/40 print:hover:border-transparent";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-sm text-slate-500">〒</span>
        <input
          value={zipcode}
          onChange={(e) => { onZipcodeChange(e.target.value); lookup(e.target.value); }}
          placeholder="123-4567"
          maxLength={8}
          className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-amber-50/40 print:hover:border-transparent"
        />
        {loading && <span className="text-xs text-slate-400">検索中…</span>}
      </div>
      {suggestion && (
        <button
          type="button"
          onClick={() => { onAddressChange(suggestion); setSuggestion(null); }}
          className="text-left text-xs text-blue-600 hover:underline print:hidden"
        >
          → {suggestion}（クリックで反映）
        </button>
      )}
      <input
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="東京都〇〇区〇〇 1-2-3"
        className={lineClass}
      />
    </div>
  );
}

function Line({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-amber-50/40 print:hover:border-transparent ${className}`}
    />
  );
}

function Block({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [recording, setRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const baseRef = useRef(value);

  // テキストエリア手動編集時にベース値を同期
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!recording) {
      baseRef.current = e.target.value;
      onChange(e.target.value);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(
        "音声入力はお使いのブラウザに対応していません。\nGoogle Chrome または Microsoft Edge をご利用ください。"
      );
      return;
    }

    // 録音開始時点のテキストを記憶
    baseRef.current = value;

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
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      const base = baseRef.current;
      const sep = base && (finalText + interimText) ? "\n" : "";
      // 確定済み＋暫定テキストをリアルタイム表示
      onChange(base + sep + finalText + interimText);
    };

    recognition.onend = () => {
      setRecording(false);
      // 録音終了時に暫定テキストを除去して確定テキストのみに
      const base = baseRef.current;
      const sep = base && finalText ? "\n" : "";
      onChange(base + sep + finalText);
    };

    recognition.onerror = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={recording ? "話してください…" : placeholder}
        rows={Math.max(3, value.split("\n").length)}
        className="w-full resize-y rounded border border-transparent bg-transparent px-1.5 py-1 pr-8 text-sm leading-relaxed outline-none hover:border-slate-300 focus:border-slate-500 focus:bg-amber-50/40 print:hover:border-transparent"
      />
      {/* 音声入力ボタン */}
      <button
        type="button"
        onClick={toggleRecording}
        title={recording ? "音声入力を停止" : "音声入力を開始（日本語）"}
        className={`absolute right-1.5 top-1.5 rounded p-1 transition-colors print:hidden ${
          recording
            ? "animate-pulse text-red-500 hover:text-red-700"
            : "text-slate-300 hover:text-slate-600"
        }`}
      >
        {recording ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
      </button>
      {/* 録音中インジケーター */}
      {recording && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-xs text-red-500 print:hidden">
          <span className="animate-pulse">●</span>
          <span>録音中</span>
        </div>
      )}
    </div>
  );
}
