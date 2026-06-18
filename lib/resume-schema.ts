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

// AIキャリアアドバイザーが「改善案」を提示する対象フィールド（本人の承認後に反映する）。
// ヒアリングのゴールはこの2項目（職務要約・自己PR）を必ずブラッシュアップすること。
export const ADVISOR_FIELDS = {
  careerSummary: "職務要約",
  selfPR: "自己PR",
} as const;

export type AdvisorField = keyof typeof ADVISOR_FIELDS;

// AIの改善提案。承認されるまで履歴書データには反映しない。
export interface AdvisorSuggestion {
  targetField: AdvisorField;
  originalText: string;
  suggestedText: string;
  reason: string;
}

// proposeImprovement ツールの入力スキーマ
export const advisorSuggestionSchema = z.object({
  targetField: z
    .enum(["careerSummary", "selfPR"])
    .describe("改善対象のフィールド。careerSummary=職務要約 / selfPR=自己PR"),
  originalText: z
    .string()
    .describe("本人が現在書いている元の文章。新規作成で元がない場合は空文字。"),
  suggestedText: z
    .string()
    .describe("改善後の文章案。本人が話した事実だけを使い、作り話や誇張をしない。"),
  reason: z
    .string()
    .describe("なぜこの案が良いのかの短い理由（1〜2文）。"),
});

export type AdvisorSuggestionInput = z.infer<typeof advisorSuggestionSchema>;

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

// AIキャリアアドバイザーに渡す「応募者プロフィール」を組み立てる。
// プライバシー保護のため、氏名・ふりがな・生年月日・性別・住所・電話・メール・写真などの
// 個人情報は一切含めず、キャリアに関わる情報だけをまとめる。
export function buildApplicantProfile(resume: ResumeData): string {
  const lines: string[] = [];
  if (resume.education.length > 0) {
    lines.push("【学歴】");
    for (const e of resume.education) {
      lines.push(`- ${e.year}年${e.month}月 ${e.description}`.trim());
    }
  }
  if (resume.workHistory.length > 0) {
    lines.push("【職歴（履歴書）】");
    for (const w of resume.workHistory) {
      lines.push(`- ${w.year}年${w.month}月 ${w.description}`.trim());
    }
  }
  if (resume.licenses.length > 0) {
    lines.push("【免許・資格】");
    for (const l of resume.licenses) {
      lines.push(`- ${l.year}年${l.month}月 ${l.name}`.trim());
    }
  }
  if (resume.careers.length > 0) {
    lines.push("【職務経歴（職務経歴書）】");
    for (const c of resume.careers) {
      lines.push(`- ${c.company}／${c.period}／${c.role}：${c.description}`.trim());
    }
  }
  if (resume.careerSummary.trim()) lines.push(`【職務要約】${resume.careerSummary}`);
  if (resume.skills.trim()) lines.push(`【スキル】${resume.skills}`);
  if (resume.selfPR.trim()) lines.push(`【自己PR（現状）】${resume.selfPR}`);
  if (resume.motivation.trim()) lines.push(`【志望動機（現状）】${resume.motivation}`);
  return lines.join("\n");
}
