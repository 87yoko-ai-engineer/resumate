"use client";

import { useState, type ReactNode } from "react";
import type { ResumeData, ResumeBasic } from "@/lib/resume-schema";
import { newId } from "@/lib/resume-schema";
import {
  YearSelect,
  MonthSelect,
  PeriodSelect,
  BirthDateSelect,
} from "@/components/resume-preview";

const FIELD =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";
const FORM_SELECT =
  "rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500";

interface DirectInputFormProps {
  resume: ResumeData;
  onChange: (resume: ResumeData) => void;
}

/**
 * 買い物サイトの入力欄のような、見やすい一覧フォーム。
 * 履歴書プレビューと同じ ResumeData を編集するので、入力すると右側の書類にも反映される。
 * 画像添付・音声入力で取り込んだ内容も、最終的にこの ResumeData を更新する形で繋ぐ予定。
 */
export default function DirectInputForm({
  resume,
  onChange,
}: DirectInputFormProps) {
  const update = (patch: Partial<ResumeData>) => onChange({ ...resume, ...patch });
  const updateBasic = (patch: Partial<ResumeBasic>) =>
    onChange({ ...resume, basic: { ...resume.basic, ...patch } });

  return (
    <section className="space-y-6 rounded-md border border-slate-200 bg-white p-5 print:hidden">
      <header className="space-y-1">
        <p className="text-xs font-semibold text-slate-500">② 履歴書作成 ｜ 直接入力</p>
        <h2 className="text-lg font-bold text-slate-900">入力フォーム</h2>
        <p className="text-xs text-slate-500">
          入力すると、右側の履歴書・職務経歴書にそのまま反映されます。
        </p>
      </header>

      {/* 基本情報 */}
      <FormSection title="基本情報">
        <Row label="氏名">
          <input
            className={FIELD}
            value={resume.basic.name}
            onChange={(e) => updateBasic({ name: e.target.value })}
            placeholder="山田 太郎"
          />
        </Row>
        <Row label="ふりがな">
          <input
            className={FIELD}
            value={resume.basic.kana}
            onChange={(e) => updateBasic({ kana: e.target.value })}
            placeholder="やまだ たろう"
          />
        </Row>
        <Row label="生年月日">
          <BirthDateSelect
            value={resume.basic.birthDate}
            onChange={(v) => updateBasic({ birthDate: v })}
            selectClassName={FORM_SELECT}
          />
        </Row>
        <Row label="性別">
          <select
            className={FORM_SELECT}
            value={resume.basic.gender}
            onChange={(e) => updateBasic({ gender: e.target.value })}
          >
            <option value="">選択</option>
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="その他">その他</option>
          </select>
        </Row>
        <Row label="郵便番号・住所">
          <ZipAddress
            zipcode={resume.basic.zipcode ?? ""}
            address={resume.basic.address}
            onZipcodeChange={(v) => updateBasic({ zipcode: v })}
            onAddressChange={(v) => updateBasic({ address: v })}
          />
        </Row>
        <Row label="電話番号">
          <input
            className={FIELD}
            value={resume.basic.phone}
            onChange={(e) => updateBasic({ phone: e.target.value })}
            placeholder="090-1234-5678"
          />
        </Row>
        <Row label="メール">
          <input
            className={FIELD}
            type="email"
            value={resume.basic.email}
            onChange={(e) => updateBasic({ email: e.target.value })}
            placeholder="taro@example.com"
          />
        </Row>
      </FormSection>

      {/* 学歴 */}
      <FormSection
        title="学歴"
        addLabel="学歴を追加"
        onAdd={() =>
          update({
            education: [
              ...resume.education,
              { id: newId(), year: "", month: "", description: "" },
            ],
          })
        }
      >
        {resume.education.length === 0 && <Empty />}
        {resume.education.map((e) => (
          <DateTextRow
            key={e.id}
            year={e.year}
            month={e.month}
            text={e.description}
            textPlaceholder="〇〇大学〇〇学部 卒業"
            onYear={(v) =>
              update({
                education: resume.education.map((x) =>
                  x.id === e.id ? { ...x, year: v } : x,
                ),
              })
            }
            onMonth={(v) =>
              update({
                education: resume.education.map((x) =>
                  x.id === e.id ? { ...x, month: v } : x,
                ),
              })
            }
            onText={(v) =>
              update({
                education: resume.education.map((x) =>
                  x.id === e.id ? { ...x, description: v } : x,
                ),
              })
            }
            onRemove={() =>
              update({
                education: resume.education.filter((x) => x.id !== e.id),
              })
            }
          />
        ))}
      </FormSection>

      {/* 職歴 */}
      <FormSection
        title="職歴"
        addLabel="職歴を追加"
        onAdd={() =>
          update({
            workHistory: [
              ...resume.workHistory,
              { id: newId(), year: "", month: "", description: "" },
            ],
          })
        }
      >
        {resume.workHistory.length === 0 && <Empty />}
        {resume.workHistory.map((w) => (
          <DateTextRow
            key={w.id}
            year={w.year}
            month={w.month}
            text={w.description}
            textPlaceholder="株式会社〇〇 入社"
            onYear={(v) =>
              update({
                workHistory: resume.workHistory.map((x) =>
                  x.id === w.id ? { ...x, year: v } : x,
                ),
              })
            }
            onMonth={(v) =>
              update({
                workHistory: resume.workHistory.map((x) =>
                  x.id === w.id ? { ...x, month: v } : x,
                ),
              })
            }
            onText={(v) =>
              update({
                workHistory: resume.workHistory.map((x) =>
                  x.id === w.id ? { ...x, description: v } : x,
                ),
              })
            }
            onRemove={() =>
              update({
                workHistory: resume.workHistory.filter((x) => x.id !== w.id),
              })
            }
          />
        ))}
      </FormSection>

      {/* 免許・資格 */}
      <FormSection
        title="免許・資格"
        addLabel="免許・資格を追加"
        onAdd={() =>
          update({
            licenses: [
              ...resume.licenses,
              { id: newId(), year: "", month: "", name: "" },
            ],
          })
        }
      >
        {resume.licenses.length === 0 && <Empty />}
        {resume.licenses.map((l) => (
          <DateTextRow
            key={l.id}
            year={l.year}
            month={l.month}
            text={l.name}
            textPlaceholder="普通自動車第一種運転免許"
            onYear={(v) =>
              update({
                licenses: resume.licenses.map((x) =>
                  x.id === l.id ? { ...x, year: v } : x,
                ),
              })
            }
            onMonth={(v) =>
              update({
                licenses: resume.licenses.map((x) =>
                  x.id === l.id ? { ...x, month: v } : x,
                ),
              })
            }
            onText={(v) =>
              update({
                licenses: resume.licenses.map((x) =>
                  x.id === l.id ? { ...x, name: v } : x,
                ),
              })
            }
            onRemove={() =>
              update({
                licenses: resume.licenses.filter((x) => x.id !== l.id),
              })
            }
          />
        ))}
      </FormSection>

      {/* 職務経歴（職務経歴書用） */}
      <FormSection
        title="職務経歴（職務経歴書用）"
        addLabel="職務経歴を追加"
        onAdd={() =>
          update({
            careers: [
              ...resume.careers,
              { id: newId(), company: "", period: "", role: "", description: "" },
            ],
          })
        }
      >
        {resume.careers.length === 0 && <Empty />}
        {resume.careers.map((c) => (
          <div key={c.id} className="space-y-2 rounded-md border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <input
                className={`${FIELD} font-semibold`}
                value={c.company}
                onChange={(e) =>
                  update({
                    careers: resume.careers.map((x) =>
                      x.id === c.id ? { ...x, company: e.target.value } : x,
                    ),
                  })
                }
                placeholder="株式会社〇〇"
              />
              <button
                type="button"
                onClick={() =>
                  update({
                    careers: resume.careers.filter((x) => x.id !== c.id),
                  })
                }
                className="shrink-0 text-xs text-red-500 hover:underline"
              >
                削除
              </button>
            </div>
            <PeriodSelect
              value={c.period}
              onChange={(v) =>
                update({
                  careers: resume.careers.map((x) =>
                    x.id === c.id ? { ...x, period: v } : x,
                  ),
                })
              }
              selectClassName={FORM_SELECT}
            />
            <input
              className={FIELD}
              value={c.role}
              onChange={(e) =>
                update({
                  careers: resume.careers.map((x) =>
                    x.id === c.id ? { ...x, role: e.target.value } : x,
                  ),
                })
              }
              placeholder="役職・担当業務"
            />
            <textarea
              className={FIELD}
              rows={3}
              value={c.description}
              onChange={(e) =>
                update({
                  careers: resume.careers.map((x) =>
                    x.id === c.id ? { ...x, description: e.target.value } : x,
                  ),
                })
              }
              placeholder="具体的な業務内容・実績"
            />
          </div>
        ))}
      </FormSection>

      {/* 自己PR・志望動機など */}
      <FormSection title="自己PR・志望動機など">
        <Row label="職務要約">
          <textarea
            className={FIELD}
            rows={2}
            value={resume.careerSummary}
            onChange={(e) => update({ careerSummary: e.target.value })}
            placeholder="キャリア全体の要約（職務経歴書用）"
          />
        </Row>
        <Row label="活かせるスキル">
          <textarea
            className={FIELD}
            rows={2}
            value={resume.skills}
            onChange={(e) => update({ skills: e.target.value })}
            placeholder="活かせる経験・知識・スキル"
          />
        </Row>
        <Row label="自己PR">
          <textarea
            className={FIELD}
            rows={4}
            value={resume.selfPR}
            onChange={(e) => update({ selfPR: e.target.value })}
            placeholder="自己PR"
          />
        </Row>
        <Row label="志望動機">
          <textarea
            className={FIELD}
            rows={4}
            value={resume.motivation}
            onChange={(e) => update({ motivation: e.target.value })}
            placeholder="志望動機"
          />
        </Row>
      </FormSection>
    </section>
  );
}

function FormSection({
  title,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="border-b border-slate-200 pb-1 text-sm font-bold text-slate-800">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ＋ {addLabel}
        </button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[130px_1fr] sm:items-center">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-slate-400">（未入力）</p>;
}

function DateTextRow({
  year,
  month,
  text,
  textPlaceholder,
  onYear,
  onMonth,
  onText,
  onRemove,
}: {
  year: string;
  month: string;
  text: string;
  textPlaceholder: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  onText: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <YearSelect value={year} onChange={onYear} className={FORM_SELECT} />
      <MonthSelect value={month} onChange={onMonth} className={FORM_SELECT} />
      <input
        className={`${FIELD} min-w-0 flex-1`}
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={textPlaceholder}
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-xs text-red-500 hover:underline"
      >
        削除
      </button>
    </div>
  );
}

function ZipAddress({
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
      // 取得失敗時は候補を出さないだけ
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">〒</span>
        <input
          className={`${FIELD} w-32`}
          value={zipcode}
          onChange={(e) => {
            onZipcodeChange(e.target.value);
            lookup(e.target.value);
          }}
          placeholder="123-4567"
          maxLength={8}
        />
        {loading && <span className="text-xs text-slate-400">検索中…</span>}
      </div>
      {suggestion && (
        <button
          type="button"
          onClick={() => {
            onAddressChange(suggestion);
            setSuggestion(null);
          }}
          className="text-left text-xs text-blue-600 hover:underline"
        >
          → {suggestion}（クリックで反映）
        </button>
      )}
      <input
        className={FIELD}
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="東京都〇〇区〇〇 1-2-3"
      />
    </div>
  );
}
