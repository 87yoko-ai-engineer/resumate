import { z } from "zod";

export type DocType = "resume" | "cv";

export const DOC_LABELS: Record<DocType, string> = {
  resume: "履歴書",
  cv: "職務経歴書",
};

export interface EducationItem {
  id: string;
  year: string;
  month: string;
  description: string;
}

export interface WorkItem {
  id: string;
  year: string;
  month: string;
  description: string;
}

export interface LicenseItem {
  id: string;
  year: string;
  month: string;
  name: string;
}

export interface CareerItem {
  id: string;
  company: string;
  period: string;
  role: string;
  description: string;
}

export interface ResumeBasic {
  name: string;
  kana: string;
  birthDate: string;
  gender: string;
  zipcode?: string;
  address: string;
  phone: string;
  email: string;
  photo?: string;
}

export interface ResumeData {
  basic: ResumeBasic;
  education: EducationItem[];
  workHistory: WorkItem[];
  licenses: LicenseItem[];
  motivation: string;
  selfPR: string;
  careerSummary: string;
  careers: CareerItem[];
  skills: string;
}

export function emptyResume(): ResumeData {
  return {
    basic: {
      name: "",
      kana: "",
      birthDate: "",
      gender: "",
      zipcode: "",
      address: "",
      phone: "",
      email: "",
    },
    education: [],
    workHistory: [],
    licenses: [],
    motivation: "",
    selfPR: "",
    careerSummary: "",
    careers: [],
    skills: "",
  };
}

// AIが履歴書フィールドを更新するためのツール入力スキーマ。すべて任意。
export const resumeUpdateSchema = z.object({
  basic: z
    .object({
      name: z.string(),
      kana: z.string(),
      birthDate: z.string(),
      gender: z.string(),
      address: z.string(),
      phone: z.string(),
      email: z.string(),
    })
    .partial()
    .optional()
    .describe("氏名・ふりがな・生年月日・性別・住所・電話・メールなどの基本情報"),
  education: z
    .array(
      z.object({
        year: z.string().describe("西暦4桁"),
        month: z.string().describe("月（数字）"),
        description: z.string().describe("学校名・学部学科・入学/卒業など"),
      }),
    )
    .optional()
    .describe("学歴。判明している全件をまとめて渡す"),
  workHistory: z
    .array(
      z.object({
        year: z.string(),
        month: z.string(),
        description: z.string().describe("会社名・入社/退社など履歴書用の簡潔な記述"),
      }),
    )
    .optional()
    .describe("履歴書の職歴欄。判明している全件をまとめて渡す"),
  licenses: z
    .array(
      z.object({
        year: z.string(),
        month: z.string(),
        name: z.string().describe("免許・資格名"),
      }),
    )
    .optional()
    .describe("免許・資格。判明している全件をまとめて渡す"),
  motivation: z.string().optional().describe("志望動機（本人の言葉のまま。装飾しない）"),
  selfPR: z.string().optional().describe("自己PR（本人の言葉のまま。装飾しない）"),
  careerSummary: z.string().optional().describe("職務経歴書の職務要約（本人の言葉のまま）"),
  careers: z
    .array(
      z.object({
        company: z.string(),
        period: z.string().describe("在籍期間 例: 2020年4月〜2023年3月"),
        role: z.string().describe("役職・担当業務の見出し"),
        description: z.string().describe("具体的な業務内容・実績"),
      }),
    )
    .optional()
    .describe("職務経歴書の職務経歴。判明している全件をまとめて渡す"),
  skills: z.string().optional().describe("活かせる経験・知識・スキル"),
});

export type ResumeUpdate = z.infer<typeof resumeUpdateSchema>;

// ブラッシュアップ対象フィールド
export const BRUSHUP_FIELDS = {
  motivation: "志望動機",
  selfPR: "自己PR",
  careerSummary: "職務要約",
} as const;

export type BrushupField = keyof typeof BRUSHUP_FIELDS;

export interface JobAnalysis {
  companyName: string;
  requirements: string;
  motivationDraft: string;
  selfPRDraft: string;
  questions: string[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// AIツールが返した部分更新を現在の履歴書データにマージする。
export function mergeUpdate(current: ResumeData, update: ResumeUpdate): ResumeData {
  const next: ResumeData = {
    ...current,
    basic: { ...current.basic, ...(update.basic ?? {}) },
  };
  if (update.education) {
    next.education = update.education.map((e) => ({ id: uid(), ...e }));
  }
  if (update.workHistory) {
    next.workHistory = update.workHistory.map((w) => ({ id: uid(), ...w }));
  }
  if (update.licenses) {
    next.licenses = update.licenses.map((l) => ({ id: uid(), ...l }));
  }
  if (update.careers) {
    next.careers = update.careers.map((c) => ({ id: uid(), ...c }));
  }
  if (update.motivation !== undefined) next.motivation = update.motivation;
  if (update.selfPR !== undefined) next.selfPR = update.selfPR;
  if (update.careerSummary !== undefined) next.careerSummary = update.careerSummary;
  if (update.skills !== undefined) next.skills = update.skills;
  return next;
}

export function newId(): string {
  return uid();
}
